#!/usr/bin/env node
/**
 * 回声(Huisheen)外部API测试脚本
 * 演示如何使用外部API获取和管理通知
 */

const axios = require('axios');

// 配置
const HUISHEEN_BASE_URL = 'http://localhost:3000';
const api = axios.create({
  baseURL: `${HUISHEEN_BASE_URL}/api/external`,
  timeout: 10000
});

class HuisheenExternalAPI {
  constructor() {
    this.token = null;
    this.notifyId = null;
  }

  /**
   * 使用通知标识码获取访问Token
   */
  async authenticate(notifyCode, thirdPartyName, thirdPartyUrl) {
    try {
      console.log('🔐 正在认证...');
      console.log(`通知标识码: ${notifyCode}`);
      
      const response = await api.post('/auth', {
        notifyCode,
        thirdPartyName,
        thirdPartyUrl
      });

      this.token = response.data.token;
      this.notifyId = response.data.userInfo.notifyId;
      
      // 设置默认请求头
      api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      
      console.log('✅ 认证成功!');
      console.log(`用户: ${response.data.userInfo.username}`);
      console.log(`Token有效期: ${response.data.expiresIn}`);
      console.log('');
      
      return response.data;
    } catch (error) {
      console.error('❌ 认证失败:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * 获取未读通知
   */
  async getUnreadNotifications(options = {}) {
    try {
      console.log('📥 获取未读通知...');
      
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.type) params.append('type', options.type);
      if (options.priority) params.append('priority', options.priority);
      if (options.since) params.append('since', options.since);
      
      const response = await api.get(`/notifications?${params.toString()}`);
      
      const { notifications, pagination } = response.data.data;
      
      console.log(`📊 统计信息:`);
      console.log(`  - 返回数量: ${pagination.returned}`);
      console.log(`  - 总未读数: ${pagination.totalUnread}`);
      console.log('');
      
      if (notifications.length > 0) {
        console.log('📋 未读通知列表:');
        notifications.forEach((notif, index) => {
          console.log(`${index + 1}. [${notif.type.toUpperCase()}] ${notif.title}`);
          console.log(`   内容: ${notif.content.substring(0, 50)}...`);
          console.log(`   优先级: ${notif.priority} | 来源: ${notif.subscription.name}`);
          console.log(`   ID: ${notif.id}`);
          console.log('');
        });
      } else {
        console.log('🎉 没有未读通知！');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ 获取通知失败:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId) {
    try {
      console.log(`✅ 标记通知为已读: ${notificationId}`);
      
      const response = await api.patch(`/notifications/${notificationId}/read`);
      
      console.log(`✅ ${response.data.message}`);
      console.log('');
      
      return response.data;
    } catch (error) {
      console.error('❌ 标记已读失败:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * 批量标记通知为已读
   */
  async batchMarkAsRead(notificationIds) {
    try {
      console.log(`✅ 批量标记通知为已读，数量: ${notificationIds.length}`);
      
      const response = await api.patch('/notifications/batch/read', {
        notificationIds
      });
      
      console.log(`✅ ${response.data.message}`);
      console.log('');
      
      return response.data;
    } catch (error) {
      console.error('❌ 批量标记已读失败:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      console.log('📊 获取统计信息...');
      
      const response = await api.get('/stats');
      const stats = response.data.data;
      
      console.log('📈 通知统计:');
      console.log(`  - 总通知数: ${stats.total}`);
      console.log(`  - 未读通知: ${stats.unread}`);
      console.log(`  - 已读通知: ${stats.read}`);
      console.log(`  - 今日通知: ${stats.today}`);
      
      if (Object.keys(stats.unreadByType).length > 0) {
        console.log('  - 按类型分组:');
        Object.entries(stats.unreadByType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      }
      console.log('');
      
      return response.data;
    } catch (error) {
      console.error('❌ 获取统计失败:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * 获取API信息
   */
  async getAPIInfo() {
    try {
      const response = await api.get('/info');
      return response.data;
    } catch (error) {
      console.error('❌ 获取API信息失败:', error.message);
      throw error;
    }
  }
}

// 使用示例
async function main() {
  const client = new HuisheenExternalAPI();
  
  try {
    console.log('🚀 回声(Huisheen)外部API测试');
    console.log('================================');
    console.log('');
    
    // 如果有命令行参数，使用提供的通知标识码
    const notifyCode = process.argv[2];
    
    if (!notifyCode) {
      console.log('❌ 请提供通知标识码作为参数');
      console.log('用法: node external-api-test.js notify:user:xxxx-xxxx-xxxx:xxxxxx');
      console.log('');
      console.log('💡 如何获取通知标识码:');
      console.log('1. 在回声平台登录');
      console.log('2. 进入"设置"页面');
      console.log('3. 点击"生成标识码"按钮');
      console.log('4. 复制生成的标识码');
      return;
    }
    
    // 1. 认证
    await client.authenticate(
      notifyCode,
      '测试应用',
      'https://example.com'
    );
    
    // 2. 获取统计信息
    await client.getStats();
    
    // 3. 获取未读通知
    const notificationsData = await client.getUnreadNotifications({
      limit: 5
    });
    
    // 4. 如果有未读通知，标记第一个为已读
    const notifications = notificationsData.data.notifications;
    if (notifications.length > 0) {
      await client.markAsRead(notifications[0].id);
      
      // 再次获取统计信息查看变化
      console.log('📊 标记已读后的统计信息:');
      await client.getStats();
    }
    
    console.log('🎉 测试完成！');
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = HuisheenExternalAPI; 