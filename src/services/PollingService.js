const cron = require('node-cron');
const axios = require('axios');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const config = require('../config/config');

class PollingService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  // 启动轮询服务
  start() {
    if (this.isRunning) {
      console.log('轮询服务已在运行中');
      return;
    }

    console.log('启动轮询服务...');
    this.isRunning = true;

    // 每分钟检查一次是否有需要轮询的订阅
    cron.schedule('* * * * *', async () => {
      await this.checkAndPoll();
    });

    console.log('轮询服务启动成功');
  }

  // 停止轮询服务
  stop() {
    this.isRunning = false;
    this.jobs.clear();
    console.log('轮询服务已停止');
  }

  // 检查并执行轮询 - 优化版本，按serviceHost分组
  async checkAndPoll() {
    try {
      const now = new Date();
      
      // 查找需要轮询的被动模式订阅
      const subscriptions = await Subscription.find({
        mode: 'passive',
        isActive: true,
        apiEndpoint: { $exists: true, $ne: null },
        $or: [
          { "serviceStatus.isActive": true },
          { "serviceStatus.isActive": { $exists: false } },
          { serviceStatus: { $exists: false } }
        ]
      }).populate('userId');

      // 按完整API端点URL分组
      const serviceGroups = new Map();
      
      // 对订阅进行分组
      for (const subscription of subscriptions) {
        const apiEndpoint = subscription.apiEndpoint;
        
        if (!serviceGroups.has(apiEndpoint)) {
          serviceGroups.set(apiEndpoint, {
            apiEndpoint: apiEndpoint,
            subscriptions: [],
            shouldPoll: false,
            minPollingInterval: Infinity
          });
        }
        
        const group = serviceGroups.get(apiEndpoint);
        group.subscriptions.push(subscription);
        
        // 检查该订阅是否应该被轮询
        const shouldPollThisSubscription = this.shouldPollSubscription(subscription, now);
        if (shouldPollThisSubscription) {
          group.shouldPoll = true;
        }
        
        // 记录最小的轮询间隔，用于更新所有订阅的lastPolled时间
        if (subscription.pollingInterval < group.minPollingInterval) {
          group.minPollingInterval = subscription.pollingInterval;
        }
      }
      
      // 对每个服务组执行一次轮询
      for (const [apiEndpoint, group] of serviceGroups.entries()) {
        if (group.shouldPoll) {
          console.log(`轮询服务组: ${apiEndpoint}，共有 ${group.subscriptions.length} 个订阅`);
          await this.pollServiceGroup(group, now);
        }
      }
    } catch (error) {
      console.error('轮询检查错误:', error);
    }
  }

  // 轮询服务组（一个serviceHost的所有订阅）
  async pollServiceGroup(group, now) {
    try {
      // 为组内所有订阅更新最后轮询时间
      const updatePromises = group.subscriptions.map(async subscription => {
        subscription.lastPolled = now;
        return subscription.save();
      });
      
      await Promise.all(updatePromises);
      
      // 只执行一次HTTP请求
      const response = await axios.get(group.apiEndpoint, {
        timeout: 30000, // 30秒超时
        headers: {
          'User-Agent': 'Huisheen-Polling-Service/1.0',
          'Accept': 'application/json'
        }
      });
      
      // 处理响应数据，将结果分发给所有订阅
      await this.processGroupPollingResponse(group.subscriptions, response.data);
      
    } catch (error) {
      console.error(`服务组轮询错误 (${group.apiEndpoint}):`, error.message);
      // 可以在这里记录错误或发送错误通知
      if (error.response) {
        console.error(`HTTP状态码: ${error.response.status}`);
      }
    }
  }
  
  // 处理服务组的轮询响应，将结果分发给所有订阅
  async processGroupPollingResponse(subscriptions, data) {
    try {
      // 根据标准化格式处理数据
      let notifications = [];

      if (Array.isArray(data)) {
        notifications = data;
      } else if (data.notifications && Array.isArray(data.notifications)) {
        notifications = data.notifications;
      } else if (data.data && Array.isArray(data.data)) {
        notifications = data.data;
      } else {
        // 如果不是数组，将单个对象作为通知处理
        notifications = [data];
      }
      
      // 为每个订阅处理通知
      for (const subscription of subscriptions) {
        let processedCount = 0;
        
        for (const notifData of notifications) {
          const processed = await this.createNotificationFromPolling(subscription, notifData);
          if (processed) processedCount++;
        }
        
        console.log(`为订阅 ${subscription._id} 处理了 ${processedCount} 条通知`);
      }
    } catch (error) {
      console.error(`处理服务组轮询响应错误:`, error);
    }
  }

  // 判断是否应该轮询
  shouldPollSubscription(subscription, now) {
    if (!subscription.lastPolled) {
      return true; // 首次轮询
    }

    const intervalMs = subscription.pollingInterval * 60 * 1000; // 转换为毫秒
    const nextPollTime = new Date(subscription.lastPolled.getTime() + intervalMs);
    
    return now >= nextPollTime;
  }

  // 执行轮询（仅用于单个订阅的手动触发）
  async pollSubscription(subscription) {
    try {
      // 更新最后轮询时间
      subscription.lastPolled = new Date();
      await subscription.save();

      // 发起HTTP请求
      const response = await axios.get(subscription.apiEndpoint, {
        timeout: 30000, // 30秒超时
        headers: {
          'User-Agent': 'Huisheen-Polling-Service/1.0',
          'Accept': 'application/json'
        }
      });

      // 处理响应数据
      await this.processPollingResponse(subscription, response.data);

    } catch (error) {
      // 可以在这里记录错误或发送错误通知
      if (error.response) {
        console.error(`HTTP状态码: ${error.response.status}`);
      }
    }
  }

  // 处理轮询响应数据 - 用于单个订阅的手动触发
  async processPollingResponse(subscription, data) {
    try {
      // 根据标准化格式处理数据
      let notifications = [];

      if (Array.isArray(data)) {
        notifications = data;
      } else if (data.notifications && Array.isArray(data.notifications)) {
        notifications = data.notifications;
      } else if (data.data && Array.isArray(data.data)) {
        notifications = data.data;
      } else {
        // 如果不是数组，将单个对象作为通知处理
        notifications = [data];
      }

      let processedCount = 0;

      for (const notifData of notifications) {
        const processed = await this.createNotificationFromPolling(subscription, notifData);
        if (processed) processedCount++;
      }

    } catch (error) {
      console.error(`处理轮询响应错误 ${subscription.thirdPartyName}:`, error);
    }
  }

  // 从轮询数据创建通知
  async createNotificationFromPolling(subscription, notifData) {
    try {
      // 提取通知信息
      const title = notifData.title || notifData.subject || notifData.message || '新通知';
      const content = notifData.content || notifData.body || notifData.description || notifData.message || '';
      const type = notifData.type || 'info';
      const priority = notifData.priority || 'normal';
      const externalId = notifData.id || notifData.uuid || notifData.external_id;
      const callbackUrl = notifData.callback_url || notifData.callbackUrl || notifData.link || notifData.url;

      // 检查是否重复
      if (externalId) {
        const existing = await Notification.findOne({
          subscriptionId: subscription._id,
          externalId
        });

        if (existing) {
          return false; // 跳过重复通知
        }
      }

      // 创建通知
      const notification = new Notification({
        userId: subscription.userId._id,
        subscriptionId: subscription._id,
        title: title.substring(0, 200), // 限制长度
        content: content.substring(0, 2000), // 限制长度
        type: ['info', 'warning', 'error', 'success'].includes(type) ? type : 'info',
        priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
        callbackUrl: callbackUrl ? callbackUrl.substring(0, 500) : undefined, // 限制长度
        source: {
          name: subscription.thirdPartyName,
          url: subscription.thirdPartyUrl,
          icon: notifData.icon || notifData.avatar
        },
        metadata: {
          polled: true,
          originalData: notifData
        },
        externalId,
        rawData: notifData
      });

      await notification.save();

      // 更新订阅统计
      subscription.lastNotificationAt = new Date();
      subscription.notificationCount += 1;
      await subscription.save();

      return true;

    } catch (error) {
      console.error('创建轮询通知错误:', error);
      return false;
    }
  }

  // 手动触发特定订阅的轮询
  async triggerPoll(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId).populate('userId');
      
      if (!subscription || subscription.mode !== 'passive') {
        throw new Error('订阅不存在或不是被动模式');
      }
      
      // 检查服务状态
      if (subscription.serviceStatus && subscription.serviceStatus.isActive === false) {
        throw new Error('服务已被管理员禁用，无法进行轮询');
      }

      await this.pollSubscription(subscription);
      return true;
    } catch (error) {
      console.error('手动轮询错误:', error);
      throw error;
    }
  }

  // 轮询单个订阅并返回详细结果
  async pollSingleSubscription(subscription) {
    try {

      const notificationCountBefore = subscription.notificationCount;

      // 更新最后轮询时间
      subscription.lastPolled = new Date();
      await subscription.save();

      // 发起HTTP请求
      const response = await axios.get(subscription.apiEndpoint, {
        timeout: 30000, // 30秒超时
        headers: {
          'User-Agent': 'Huisheen-Polling-Service/1.0',
          'Accept': 'application/json'
        }
      });

      // 处理响应数据并统计新通知
      let newNotifications = 0;
      
      // 根据标准化格式处理数据
      let notifications = [];

      if (Array.isArray(response.data)) {
        notifications = response.data;
      } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
        notifications = response.data.notifications;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        notifications = response.data.data;
      } else {
        // 如果不是数组，将单个对象作为通知处理
        notifications = [response.data];
      }

      for (const notifData of notifications) {
        const processed = await this.createNotificationFromPolling(subscription, notifData);
        if (processed) newNotifications++;
      }

      // 重新查询订阅以获取最新的统计信息
      const updatedSubscription = await subscription.constructor.findById(subscription._id);

      return {
        newNotifications,
        notificationCount: updatedSubscription.notificationCount,
        totalNotifications: notifications.length,
        polledAt: updatedSubscription.lastPolled
      };

    } catch (error) {
      throw error;
    }
  }
}

// 单例模式
const pollingService = new PollingService();
module.exports = pollingService; 