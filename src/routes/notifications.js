const express = require('express');
const { body, query } = require('express-validator');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { ERROR_CODES, createErrorResponse } = require('../utils/errorHandler');
const mongoose = require('mongoose');

const router = express.Router();

// 接收通知 (主动模式 - 第三方直接推送)
router.post('/receive', [
  body('notifyId').matches(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/).withMessage('通知ID格式不正确'),
  body('token').exists().withMessage('Token不能为空'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('标题长度必须在1-200个字符之间'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('内容长度必须在1-2000个字符之间'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('通知类型无效'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
  body('callbackUrl').optional().isURL().withMessage('回调链接格式不正确'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { notifyId, token, title, content, type = 'info', priority = 'normal', callbackUrl, externalId, metadata } = req.body;
    
    // 查找订阅
    const subscription = await Subscription.findOne({ token });
    
    if (!subscription) {
      return res.status(404).json(
        createErrorResponse(
          '订阅不存在或令牌无效', 
          ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查订阅是否被禁用
    if (!subscription.isActive) {
      return res.status(403).json(
        createErrorResponse(
          '此订阅已被禁用，无法接收通知', 
          ERROR_CODES.SUBSCRIPTION_DISABLED,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查服务是否被管理员禁用
    if (subscription.serviceStatus && subscription.serviceStatus.isActive === false) {
      return res.status(403).json(
        createErrorResponse(
          '此服务已被管理员禁用，无法接收通知', 
          ERROR_CODES.SERVICE_DISABLED,
          { reason: 'service_disabled' },
          req.originalUrl
        )
      );
    }
    
    // 准备通知数据
    const notificationData = {
      userId: subscription.userId,
      subscriptionId: subscription._id,
      title,
      content,
      type,
      priority,
      callbackUrl,
      source: {
        name: subscription.thirdPartyName,
        url: subscription.thirdPartyUrl
      },
      metadata,
      receivedAt: new Date()
    };
    
    // 如果提供了外部ID，添加到通知数据中（用于去重）
    if (externalId) {
      notificationData.externalId = externalId;
    } else if (metadata && metadata.id) {
      // 如果metadata中有id字段，也可以用作外部ID
      notificationData.externalId = String(metadata.id);
    } else {
      // 生成一个唯一ID作为外部ID，以避免重复键错误
      notificationData.externalId = new mongoose.Types.ObjectId().toString();
    }
    
    // 创建通知
    const notification = new Notification(notificationData);
    await notification.save();
    
    // 更新订阅的最后通知时间和通知计数
    subscription.lastNotificationAt = new Date();
    subscription.notificationCount += 1;
    await subscription.save();
    
    res.status(201).json({
      message: '通知已成功接收',
      notification: {
        id: notification._id,
        title: notification.title,
        receivedAt: notification.receivedAt
      }
    });
  } catch (error) {
    console.error('接收通知错误:', error);
    
    // 处理重复键错误
    if (error.code === 11000 && error.keyPattern && (error.keyPattern.subscriptionId || error.keyPattern.externalId)) {
      return res.status(409).json(
        createErrorResponse(
          '通知已存在，请避免发送重复通知', 
          ERROR_CODES.DUPLICATE_NOTIFICATION,
          { 
            details: '通知去重失败，可能是因为未提供有效的externalId',
            subscriptionId: error.keyValue?.subscriptionId?.toString(),
            externalId: error.keyValue?.externalId
          },
          req.originalUrl
        )
      );
    }
    
    // 处理其他错误
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

// 获取通知统计
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalNotifications, unreadNotifications, stats] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
      Notification.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const typeStats = {};
    stats.forEach(stat => {
      typeStats[stat._id] = stat.count;
    });

    res.json({
      total: totalNotifications,
      unread: unreadNotifications,
      read: totalNotifications - unreadNotifications,
      byType: typeStats
    });
  } catch (error) {
    console.error('获取通知统计错误:', error);
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

// 获取分类统计信息
router.get('/categories/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // 按来源分类
    const sourceStats = await Notification.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$source.name',
          count: { $sum: 1 },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 按类型分类
    const typeStats = await Notification.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      }
    ]);

    // 按优先级分类
    const priorityStats = await Notification.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      }
    ]);

    // 按时间分类
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const timeStats = await Promise.all([
      Notification.countDocuments({ 
        userId, 
        receivedAt: { $gte: today } 
      }),
      Notification.countDocuments({ 
        userId, 
        receivedAt: { $gte: yesterday, $lt: today } 
      }),
      Notification.countDocuments({ 
        userId, 
        receivedAt: { $gte: thisWeek, $lt: yesterday } 
      }),
      Notification.countDocuments({ 
        userId, 
        receivedAt: { $gte: thisMonth, $lt: thisWeek } 
      }),
      Notification.countDocuments({ 
        userId, 
        receivedAt: { $lt: thisMonth } 
      })
    ]);

    res.json({
      sources: sourceStats,
      types: typeStats,
      priorities: priorityStats,
      times: {
        today: timeStats[0],
        yesterday: timeStats[1],
        thisWeek: timeStats[2],
        thisMonth: timeStats[3],
        older: timeStats[4]
      }
    });
  } catch (error) {
    console.error('获取分类统计错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 全部标记为已读
router.patch('/all/read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      message: `已标记 ${result.modifiedCount} 条通知为已读`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('全部标记已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 批量标记通知为已读
router.patch('/batch/read', auth, [
  body('notificationIds').isArray().withMessage('通知ID列表必须是数组'),
  body('notificationIds.*').isMongoId().withMessage('通知ID格式不正确'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { notificationIds } = req.body;

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
      message: `已标记 ${result.modifiedCount} 条通知为已读`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('批量标记已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取用户通知列表
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('通知类型无效'),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
  query('isRead').optional().isBoolean().withMessage('已读状态必须是布尔值'),
  query('source').optional().isString().withMessage('来源必须是字符串'),
  query('timeRange').optional().isIn(['today', 'yesterday', 'thisWeek', 'thisMonth', 'older']).withMessage('时间范围无效'),
  handleValidationErrors
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { userId: req.user._id };
    if (req.query.type) query.type = req.query.type;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.isRead !== undefined) query.isRead = req.query.isRead === 'true';
    if (req.query.source) query['source.name'] = req.query.source;

    // 按时间范围筛选
    if (req.query.timeRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (req.query.timeRange) {
        case 'today':
          query.receivedAt = { $gte: today };
          break;
        case 'yesterday':
          query.receivedAt = { $gte: yesterday, $lt: today };
          break;
        case 'thisWeek':
          query.receivedAt = { $gte: thisWeek, $lt: yesterday };
          break;
        case 'thisMonth':
          query.receivedAt = { $gte: thisMonth, $lt: thisWeek };
          break;
        case 'older':
          query.receivedAt = { $lt: thisMonth };
          break;
      }
    }

    // 获取通知列表
    const notifications = await Notification.find(query)
      .populate('subscriptionId', 'thirdPartyName thirdPartyUrl mode')
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit);

    // 获取总数
    const total = await Notification.countDocuments(query);

    res.json({
      notifications: notifications.map(notif => ({
        id: notif._id,
        title: notif.title,
        content: notif.content,
        type: notif.type,
        priority: notif.priority,
        callbackUrl: notif.callbackUrl,
        source: notif.source,
        metadata: notif.metadata,
        isRead: notif.isRead,
        readAt: notif.readAt,
        receivedAt: notif.receivedAt,
        rawData: notif.rawData,
        subscription: notif.subscriptionId ? {
          id: notif.subscriptionId._id,
          name: notif.subscriptionId.thirdPartyName,
          url: notif.subscriptionId.thirdPartyUrl,
          mode: notif.subscriptionId.mode || 'unknown'
        } : {
          id: null,
          name: '已删除的订阅',
          url: '',
          mode: 'unknown'
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取通知列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个通知详情
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('subscriptionId', 'thirdPartyName thirdPartyUrl mode');

    if (!notification) {
      return res.status(404).json(
        createErrorResponse(
          '通知不存在', 
          ERROR_CODES.NOTIFICATION_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }

    res.json({
      notification: {
        id: notification._id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        priority: notification.priority,
        callbackUrl: notification.callbackUrl,
        source: notification.source,
        metadata: notification.metadata,
        isRead: notification.isRead,
        readAt: notification.readAt,
        receivedAt: notification.receivedAt,
        rawData: notification.rawData,
        subscription: notification.subscriptionId ? {
          id: notification.subscriptionId._id,
          name: notification.subscriptionId.thirdPartyName,
          url: notification.subscriptionId.thirdPartyUrl,
          mode: notification.subscriptionId.mode
        } : {
          id: null,
          name: '已删除的订阅',
          url: '',
          mode: 'unknown'
        }
      }
    });
  } catch (error) {
    console.error('获取通知详情错误:', error);
    
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json(
        createErrorResponse(
          '无效的通知ID格式', 
          ERROR_CODES.INVALID_FORMAT,
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

// 标记通知为已读
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json(
        createErrorResponse(
          '通知不存在', 
          ERROR_CODES.NOTIFICATION_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }

    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      message: '通知已标记为已读',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });
  } catch (error) {
    console.error('标记通知已读错误:', error);
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

// 删除通知
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json(
        createErrorResponse(
          '通知不存在', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }

    res.json({ message: '通知删除成功' });
  } catch (error) {
    console.error('删除通知错误:', error);
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

module.exports = router; 