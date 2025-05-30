const express = require('express');
const { body, query } = require('express-validator');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { handleValidationErrors } = require('../middleware/validation');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { validateNotifyCodeDomain, validateThirdPartyUrl } = require('../utils/domainValidator');

const router = express.Router();

// 外部API Token验证中间件
const externalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '缺少认证Token' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // 验证token类型
      if (decoded.type !== 'external_api') {
        return res.status(401).json({ error: 'Token类型无效' });
      }

      // 查找用户
      const user = await User.findOne({ notifyId: decoded.notifyId });
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      req.user = user;
      req.notifyId = decoded.notifyId;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Token无效或已过期' });
    }
  } catch (error) {
    console.error('外部API认证错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

/**
 * 验证通知标识码并获取访问Token
 * POST /api/external/auth
 */
router.post('/auth', [
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
  body('thirdPartyName').trim().isLength({ min: 1, max: 100 })
    .withMessage('第三方应用名称必须在1-100个字符之间'),
  body('thirdPartyUrl').optional()
    .isURL({ protocols: ['http', 'https'], require_tld: false }).withMessage('第三方应用URL格式不正确')
    .custom((value) => {
      // 只有当提供了URL时才验证
      if (value) {
        const validation = validateThirdPartyUrl(value);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
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
      return res.status(400).json({ error: '通知标识码格式不正确' });
    }
    
    const notifyId = parts[2]; // 提取notifyId部分
    const verifyCode = parts[3]; // 提取验证码部分
    
    // 查找用户
    const user = await User.findOne({ notifyId });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 验证通知标识码是否有效 - 使用用户实例的验证方法
    if (!user.verifyNotifyCode(verifyCode)) {
      return res.status(401).json({ error: '通知标识码已过期或无效' });
    }
    
    // 生成外部API访问Token
    const token = jwt.sign(
      {
        type: 'external_api',
        notifyId: user.notifyId,
        userId: user._id.toString(),
        thirdPartyName,
        thirdPartyUrl
      },
      config.jwtSecret,
      { expiresIn: '30d' } // 30天有效期
    );
    
    res.status(201).json({
      message: '认证成功',
      token,
      userInfo: {
        notifyId: user.notifyId,
        username: user.username
      },
      expiresIn: '30天'
    });
    
  } catch (error) {
    console.error('外部API认证错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取用户的未读通知
 * GET /api/external/notifications
 */
router.get('/notifications', externalAuth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('数量限制必须在1-100之间'),
  query('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('通知类型无效'),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
  query('since').optional().isISO8601().withMessage('时间格式不正确'),
  handleValidationErrors
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { type, priority, since } = req.query;
    
    // 构建查询条件 - 默认只返回未读通知
    const query = { 
      userId: req.user._id,
      isRead: false // 只返回未读通知
    };
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (since) {
      query.receivedAt = { $gte: new Date(since) };
    }
    
    // 获取未读通知
    const notifications = await Notification.find(query)
      .populate('subscriptionId', 'thirdPartyName thirdPartyUrl mode')
      .sort({ receivedAt: -1 })
      .limit(limit);
    
    // 获取总的未读通知数量
    const totalUnread = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });
    
    res.json({
      success: true,
      data: {
        notifications: notifications.map(notif => ({
          id: notif._id,
          title: notif.title,
          content: notif.content,
          type: notif.type,
          priority: notif.priority,
          receivedAt: notif.receivedAt,
          source: notif.source,
          callbackUrl: notif.callbackUrl,
          metadata: notif.metadata,
          subscription: {
            name: notif.subscriptionId?.thirdPartyName || 'Unknown',
            mode: notif.subscriptionId?.mode || 'unknown'
          }
        })),
        pagination: {
          returned: notifications.length,
          totalUnread,
          limit
        }
      }
    });
    
  } catch (error) {
    console.error('获取外部通知错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 标记指定通知为已读
 * PATCH /api/external/notifications/:id/read
 */
router.patch('/notifications/:id/read', externalAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // 查找并更新通知
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }
    
    if (notification.isRead) {
      return res.json({
        success: true,
        message: '通知已经是已读状态',
        notification: {
          id: notification._id,
          isRead: true,
          readAt: notification.readAt
        }
      });
    }
    
    // 标记为已读
    await notification.markAsRead();
    
    res.json({
      success: true,
      message: '通知已标记为已读',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });
    
  } catch (error) {
    console.error('标记外部通知已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 批量标记多个通知为已读
 * PATCH /api/external/notifications/batch/read
 */
router.patch('/notifications/batch/read', externalAuth, [
  body('notificationIds').isArray().withMessage('通知ID列表必须是数组'),
  body('notificationIds.*').isMongoId().withMessage('通知ID格式不正确'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (notificationIds.length === 0) {
      return res.status(400).json({ error: '通知ID列表不能为空' });
    }
    
    // 批量更新
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        userId: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: `已标记 ${result.modifiedCount} 条通知为已读`,
      modifiedCount: result.modifiedCount,
      totalRequested: notificationIds.length
    });
    
  } catch (error) {
    console.error('批量标记外部通知已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取通知统计信息
 * GET /api/external/stats
 */
router.get('/stats', externalAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [totalNotifications, unreadNotifications, todayNotifications] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
      Notification.countDocuments({ 
        userId, 
        receivedAt: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
        } 
      })
    ]);
    
    // 按类型统计未读通知
    const unreadByType = await Notification.aggregate([
      { $match: { userId, isRead: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const typeStats = {};
    unreadByType.forEach(stat => {
      typeStats[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: totalNotifications - unreadNotifications,
        today: todayNotifications,
        unreadByType: typeStats
      }
    });
    
  } catch (error) {
    console.error('获取外部统计错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * API信息和使用说明
 * GET /api/external/info
 */
router.get('/info', (req, res) => {
  res.json({
    name: '回声(Huisheen)外部API',
    version: '1.0.0',
    description: '为第三方应用提供访问用户通知的API接口',
    authentication: {
      method: 'Bearer Token',
      tokenObtain: 'POST /api/external/auth',
      tokenFormat: 'JWT',
      tokenExpiry: '30天'
    },
    endpoints: {
      auth: {
        method: 'POST',
        path: '/api/external/auth',
        description: '使用通知标识码获取访问Token',
        parameters: {
          notifyCode: 'notify:user:xxxx-xxxx-xxxx:xxxxxx@huisheen.com',
          thirdPartyName: '第三方应用名称',
          thirdPartyUrl: '第三方应用URL（可选）'
        }
      },
      getNotifications: {
        method: 'GET',
        path: '/api/external/notifications',
        description: '获取用户的未读通知',
        parameters: {
          limit: '返回数量限制 (1-100)',
          type: '通知类型筛选',
          priority: '优先级筛选',
          since: '获取指定时间之后的通知'
        }
      },
      markAsRead: {
        method: 'PATCH',
        path: '/api/external/notifications/:id/read',
        description: '标记指定通知为已读'
      },
      batchMarkAsRead: {
        method: 'PATCH',
        path: '/api/external/notifications/batch/read',
        description: '批量标记通知为已读',
        parameters: {
          notificationIds: '通知ID数组'
        }
      },
      getStats: {
        method: 'GET',
        path: '/api/external/stats',
        description: '获取通知统计信息'
      }
    },
    examples: {
      auth: {
        request: {
          method: 'POST',
          url: '/api/external/auth',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            notifyCode: 'notify:user:1234-5678-9abc:def123@huisheen.com',
            thirdPartyName: '我的应用',
            thirdPartyUrl: 'https://myapp.com'
          }
        }
      },
      getNotifications: {
        request: {
          method: 'GET',
          url: '/api/external/notifications?limit=10&type=warning',
          headers: {
            'Authorization': 'Bearer your_token_here'
          }
        }
      }
    }
  });
});

module.exports = router; 