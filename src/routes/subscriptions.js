const express = require('express');
const { body, query } = require('express-validator');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const config = require('../config/config');
const { validateNotifyCodeDomain, validateThirdPartyUrl } = require('../utils/domainValidator');
const { ERROR_CODES, createErrorResponse } = require('../utils/errorHandler');

const router = express.Router();

// 创建被动模式订阅
router.post('/passive', auth, [
  body('apiUrl')
    .isURL({ require_tld: false }).withMessage('请输入有效的URL格式')
    .custom((value) => {
      // 使用智能URL验证
      const validation = validateThirdPartyUrl(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { apiUrl } = req.body;
    
    // 从API URL推导服务信息端点和主机名
    let serviceInfoUrl, serviceHost;
    try {
      const url = new URL(apiUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      serviceInfoUrl = `${baseUrl}/api/service-info`;
      serviceHost = url.host.toLowerCase(); // 使用host（包含端口）作为唯一标识
    } catch (error) {
      return res.status(400).json(
        createErrorResponse(
          'API地址格式不正确', 
          ERROR_CODES.INVALID_URL,
          null,
          req.originalUrl
        )
      );
    }
    
    // 调用第三方服务获取服务信息
    let serviceInfo;
    try {
      const axios = require('axios');
      const response = await axios.get(serviceInfoUrl, { timeout: 10000 });
      serviceInfo = response.data;
    } catch (error) {
      console.error('获取服务信息失败:', error.message);
      // 如果无法获取服务信息，使用默认值，但也记录错误
      const url = new URL(apiUrl);
      serviceInfo = {
        name: `第三方服务 (${url.hostname})`,
        description: '未提供描述',
        polling_interval: 5,
        api_endpoint: apiUrl
      };
      // 记录外部服务错误日志，但不返回错误，使用默认配置继续
      console.warn('EXTERNAL_SERVICE_ERROR:', {
        url: serviceInfoUrl,
        message: error.message,
        status: error.response?.status
      });
    }
    
    const thirdPartyName = serviceInfo.name;
    const thirdPartyUrl = serviceInfo.api_endpoint || apiUrl;
    const pollingInterval = serviceInfo.polling_interval || 5;
    
    // 检查是否已存在相同主机的被动模式订阅
    const existingSubscription = await Subscription.findOne({
      userId: req.user._id,
      serviceHost: serviceHost,
      mode: 'passive'
    });

    if (existingSubscription) {
      // 如果已存在，更新现有订阅而不是创建新的
      existingSubscription.thirdPartyName = thirdPartyName;
      existingSubscription.thirdPartyUrl = thirdPartyUrl;
      existingSubscription.apiEndpoint = apiUrl;
      existingSubscription.pollingInterval = pollingInterval;
      existingSubscription.isActive = true;
      existingSubscription.subscribedAt = new Date(); // 更新订阅时间
      existingSubscription.config = {
        serviceInfo: serviceInfo,
        autoDetected: true
      };
      
      await existingSubscription.save();
      
      return res.status(200).json({
        message: '被动模式订阅已更新',
        updated: true,
        subscription: {
          id: existingSubscription._id,
          thirdPartyName: existingSubscription.thirdPartyName,
          mode: existingSubscription.mode,
          apiEndpoint: existingSubscription.apiEndpoint,
          pollingInterval: existingSubscription.pollingInterval,
          subscribedAt: existingSubscription.subscribedAt
        },
        serviceInfo: {
          name: serviceInfo.name,
          description: serviceInfo.description,
          version: serviceInfo.version,
          provider: serviceInfo.provider
        }
      });
    }

    // 创建新订阅
    const subscription = new Subscription({
      userId: req.user._id,
      serviceHost: serviceHost,
      thirdPartyName,
      thirdPartyUrl: thirdPartyUrl,
      mode: 'passive',
      apiEndpoint: apiUrl,
      pollingInterval,
      config: {
        serviceInfo: serviceInfo,
        autoDetected: true
      }
    });

    await subscription.save();

    res.status(201).json({
      message: '被动模式订阅创建成功',
      subscription: {
        id: subscription._id,
        thirdPartyName: subscription.thirdPartyName,
        mode: subscription.mode,
        apiEndpoint: subscription.apiEndpoint,
        pollingInterval: subscription.pollingInterval,
        subscribedAt: subscription.subscribedAt
      },
      serviceInfo: {
        name: serviceInfo.name,
        description: serviceInfo.description,
        version: serviceInfo.version,
        provider: serviceInfo.provider
      }
    });
  } catch (error) {
    console.error('创建被动订阅错误:', error);
    
    // 区分不同类型的错误
    if (error.name === 'AxiosError') {
      return res.status(503).json(
        createErrorResponse(
          '无法连接到外部服务', 
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { message: error.message },
          req.originalUrl
        )
      );
    }
    
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 验证并创建主动模式订阅
router.post('/active/verify', [
  body('notifyCode')
    .matches(/^notify:user:[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}:[A-Z0-9]{6}@.+$/)
    .withMessage('通知标识码格式不正确')
    .custom((value) => {
      // 使用新的智能域名验证
      const validation = validateNotifyCodeDomain(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  body('thirdPartyName').trim().isLength({ min: 1 }).withMessage('第三方服务名称不能为空'),
  body('thirdPartyUrl')
    .isURL({ require_tld: false }).withMessage('请输入有效的URL格式')
    .custom((value) => {
      // 使用智能URL验证
      const validation = validateThirdPartyUrl(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { notifyCode, thirdPartyName, thirdPartyUrl } = req.body;

    // 解析通知标识码
    // 新格式: notify:user:1234-5678-9abc:ABC123@huisheen.com
    const atIndex = notifyCode.indexOf('@');
    let codeWithoutDomain = notifyCode;
    if (atIndex !== -1) {
      codeWithoutDomain = notifyCode.substring(0, atIndex);
    }
    
    const parts = codeWithoutDomain.split(':');
    if (parts.length !== 4) {
      return res.status(400).json(
        createErrorResponse(
          '通知标识码格式不正确', 
          ERROR_CODES.INVALID_FORMAT,
          null,
          req.originalUrl
        )
      );
    }
    
    const notifyId = parts[2];
    const verificationCode = parts[3];
    
    // 提取服务主机名
    let serviceHost;
    try {
      const url = new URL(thirdPartyUrl);
      serviceHost = url.host.toLowerCase();
    } catch (error) {
      return res.status(400).json(
        createErrorResponse(
          '第三方服务URL格式不正确', 
          ERROR_CODES.INVALID_URL,
          null,
          req.originalUrl
        )
      );
    }

    // 查找用户
    const user = await User.findOne({ notifyId });
    if (!user) {
      return res.status(404).json(
        createErrorResponse(
          '无效的通知标识码', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }

    // 验证标识码
    if (!user.verifyNotifyCode(verificationCode)) {
      return res.status(400).json(
        createErrorResponse(
          '通知标识码已过期或无效', 
          ERROR_CODES.RESOURCE_EXPIRED,
          null,
          req.originalUrl
        )
      );
    }

    // 检查是否已存在相同主机的主动模式订阅
    const existingSubscription = await Subscription.findOne({
      userId: user._id,
      serviceHost: serviceHost,
      mode: 'active'
    });

    if (existingSubscription) {
      // 如果已存在，更新现有订阅而不是创建新的
      existingSubscription.thirdPartyName = thirdPartyName;
      existingSubscription.thirdPartyUrl = thirdPartyUrl;
      existingSubscription.isActive = true;
      existingSubscription.subscribedAt = new Date(); // 更新订阅时间
      
      const token = existingSubscription.generateToken();
      await existingSubscription.save();
      
      return res.status(200).json({
        message: '主动模式订阅已更新',
        updated: true,
        token,
        subscription: {
          id: existingSubscription._id,
          thirdPartyName: existingSubscription.thirdPartyName,
          mode: existingSubscription.mode,
          subscribedAt: existingSubscription.subscribedAt
        }
      });
    }

    // 创建新订阅并生成token
    const subscription = new Subscription({
      userId: user._id,
      serviceHost: serviceHost,
      thirdPartyName,
      thirdPartyUrl,
      mode: 'active'
    });

    const token = subscription.generateToken();
    await subscription.save();

    res.status(201).json({
      message: '主动模式订阅验证成功',
      token,
      subscription: {
        id: subscription._id,
        thirdPartyName: subscription.thirdPartyName,
        mode: subscription.mode,
        subscribedAt: subscription.subscribedAt
      }
    });
  } catch (error) {
    console.error('验证主动订阅错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 获取用户所有订阅
router.get('/', auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user._id })
      .select('-token')
      .sort({ subscribedAt: -1 });

    res.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        serviceHost: sub.serviceHost,
        thirdPartyName: sub.thirdPartyName,
        thirdPartyUrl: sub.thirdPartyUrl,
        mode: sub.mode,
        isActive: sub.isActive,
        subscribedAt: sub.subscribedAt,
        lastNotificationAt: sub.lastNotificationAt,
        notificationCount: sub.notificationCount,
        pollingInterval: sub.pollingInterval,
        apiEndpoint: sub.apiEndpoint,
        serviceStatus: sub.serviceStatus
      }))
    });
  } catch (error) {
    console.error('获取订阅列表错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 更新订阅状态
router.patch('/:id/status', auth, [
  body('isActive').isBoolean().withMessage('状态必须是布尔值'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isActive } = req.body;

    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!subscription) {
      return res.status(404).json(
        createErrorResponse(
          '订阅不存在', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查服务是否被管理员禁用
    if (subscription.serviceStatus && subscription.serviceStatus.isActive === false) {
      return res.status(403).json(
        createErrorResponse(
          '此服务已被管理员禁用，无法修改状态', 
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          { reason: 'service_disabled' },
          req.originalUrl
        )
      );
    }

    subscription.isActive = isActive;
    await subscription.save();

    res.json({
      message: `订阅已${isActive ? '启用' : '禁用'}`,
      subscription: {
        id: subscription._id,
        isActive: subscription.isActive
      }
    });
  } catch (error) {
    console.error('更新订阅状态错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 删除订阅
router.delete('/:id', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!subscription) {
      return res.status(404).json(
        createErrorResponse(
          '订阅不存在', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }

    res.json({ message: '订阅删除成功' });
  } catch (error) {
    console.error('删除订阅错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 手动触发被动订阅轮询
router.post('/:id/trigger-poll', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
      mode: 'passive',
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json(
        createErrorResponse(
          '被动订阅不存在或已禁用', 
          ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查服务是否被管理员禁用
    if (subscription.serviceStatus && subscription.serviceStatus.isActive === false) {
      return res.status(403).json(
        createErrorResponse(
          '此服务已被管理员禁用，无法进行轮询', 
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          { reason: 'service_disabled' },
          req.originalUrl
        )
      );
    }

    // 检查是否在1分钟冷却期内
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    if (subscription.lastManualTrigger && subscription.lastManualTrigger > oneMinuteAgo) {
      const remainingSeconds = Math.ceil((subscription.lastManualTrigger.getTime() + 60 * 1000 - now.getTime()) / 1000);
      return res.status(429).json(
        createErrorResponse(
          `请等待 ${remainingSeconds} 秒后再次手动触发`, 
          ERROR_CODES.POLLING_ERROR,
          { remainingSeconds, reason: 'cooldown' },
          req.originalUrl
        )
      );
    }

    // 更新手动触发时间
    subscription.lastManualTrigger = now;
    await subscription.save();

    // 触发轮询
    const PollingService = require('../services/PollingService');
    const pollResult = await PollingService.pollSingleSubscription(subscription);

    res.json({
      message: '手动轮询触发成功',
      result: {
        newNotifications: pollResult.newNotifications,
        notificationCount: pollResult.notificationCount,
        polledAt: now
      }
    });
  } catch (error) {
    console.error('手动触发轮询错误:', error);
    
    // 区分轮询过程中的外部API错误
    if (error.name === 'AxiosError') {
      return res.status(502).json(
        createErrorResponse(
          '轮询外部服务失败', 
          ERROR_CODES.EXTERNAL_API_ERROR,
          { message: error.message },
          req.originalUrl
        )
      );
    } else if (error.message && error.message.includes('polling')) {
      return res.status(500).json(
        createErrorResponse(
          '轮询过程中发生错误', 
          ERROR_CODES.POLLING_ERROR,
          null,
          req.originalUrl
        )
      );
    }
    
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 获取用户拥有的服务统计
router.get('/my-services', auth, async (req, res) => {
  try {
    // 获取当前用户的通知ID
    const userNotifyId = req.user.notifyId;
    
    // 查找所有订阅，按serviceHost分组
    const subscriptions = await Subscription.find();
    
    // 按服务分组，并筛选出当前用户是服务所有者的订阅
    const servicesMap = new Map();
    
    for (const sub of subscriptions) {
      // 获取服务配置中的owner_notify_id
      const ownerNotifyId = sub.config?.serviceInfo?.owner_notify_id;
      
      // 如果当前用户是服务所有者，则计入统计
      if (ownerNotifyId && ownerNotifyId === userNotifyId) {
        const serviceKey = sub.serviceHost;
        
        if (!servicesMap.has(serviceKey)) {
          servicesMap.set(serviceKey, {
            id: serviceKey,
            name: sub.thirdPartyName,
            url: sub.thirdPartyUrl,
            subscriberCount: 0,
            subscribers: [],
            apiEndpoint: sub.apiEndpoint || null,
            config: sub.config
          });
        }
        
        const service = servicesMap.get(serviceKey);
        
        // 不计算服务所有者自己的订阅到订阅者数量中
        if (sub.userId.toString() !== req.user._id.toString()) {
          service.subscriberCount += 1;
          
          // 添加订阅者信息（但不包含敏感信息）
          if (!service.subscribers.some(s => s.userId === sub.userId.toString())) {
            service.subscribers.push({
              userId: sub.userId.toString(),
              subscriptionId: sub._id.toString(),
              subscribedAt: sub.subscribedAt
            });
          }
        } else {
          // 记录所有者自己的信息
          service.isOwnerSubscribed = true;
        }
      }
    }
    
    // 转换为数组
    const myServices = Array.from(servicesMap.values());
    
    res.json({
      myServices,
      total: myServices.length
    });
  } catch (error) {
    console.error('获取用户服务统计错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 预览服务信息（用于避免前端CORS问题）
router.get('/preview-service', [
  query('url').isURL({ require_tld: false }).withMessage('请输入有效的URL格式'),
  handleValidationErrors
], async (req, res) => {
  try {
    const apiUrl = req.query.url;
    
    // 从API URL推导服务信息端点
    let serviceInfoUrl;
    try {
      const url = new URL(apiUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      serviceInfoUrl = `${baseUrl}/api/service-info`;
    } catch (error) {
      return res.status(400).json(
        createErrorResponse(
          'API地址格式不正确', 
          ERROR_CODES.INVALID_URL,
          null,
          req.originalUrl
        )
      );
    }
    
    // 调用第三方服务获取服务信息
    try {
      const axios = require('axios');
      const response = await axios.get(serviceInfoUrl, { timeout: 10000 });
      return res.json(response.data);
    } catch (error) {
      console.error('获取服务信息失败:', error.message);
      // 返回错误
      return res.status(503).json(
        createErrorResponse(
          '无法获取服务信息', 
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { message: error.message },
          req.originalUrl
        )
      );
    }
  } catch (error) {
    console.error('预览服务错误:', error);
    return res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

module.exports = router; 