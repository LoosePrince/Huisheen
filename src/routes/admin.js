const express = require('express');
const mongoose = require('mongoose');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const { ERROR_CODES, createErrorResponse } = require('../utils/errorHandler');

const router = express.Router();

// 使用管理员验证中间件
router.use(adminAuth);

// 获取系统统计数据
router.get('/stats', async (req, res) => {
  try {
    // 获取当前日期（UTC）的起始时间
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // 用户统计
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    
    // 订阅统计（同一服务的主动和被动订阅算作一个）
    const subscriptions = await Subscription.find();
    
    // 使用Map来追踪不同用户的不同服务
    const uniqueServices = new Map();
    subscriptions.forEach(sub => {
      const key = `${sub.userId}_${sub.serviceHost}`;
      uniqueServices.set(key, true);
    });
    
    const totalSubscriptions = uniqueServices.size;
    
    // 今日新增订阅
    const todaySubscriptions = await Subscription.find({ createdAt: { $gte: today } });
    const uniqueTodayServices = new Map();
    todaySubscriptions.forEach(sub => {
      const key = `${sub.userId}_${sub.serviceHost}`;
      uniqueTodayServices.set(key, true);
    });
    
    const newSubscriptionsToday = uniqueTodayServices.size;
    
    // 消息统计
    const totalNotifications = await Notification.countDocuments();
    const newNotificationsToday = await Notification.countDocuments({ receivedAt: { $gte: today } });
    
    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday
      },
      subscriptions: {
        total: totalSubscriptions,
        newToday: newSubscriptionsToday
      },
      notifications: {
        total: totalNotifications,
        newToday: newNotificationsToday
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('获取管理员统计数据错误:', error);
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

// 获取用户分页列表
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find({}, '-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      User.countDocuments()
    ]);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
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

// 获取订阅服务统计
router.get('/services', async (req, res) => {
  try {
    const result = await Subscription.aggregate([
      {
        $group: {
          _id: '$serviceHost',
          count: { $sum: 1 },
          name: { $first: '$thirdPartyName' },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          passive: { $sum: { $cond: [{ $eq: ['$mode', 'passive'] }, 1, 0] } },
          activeMode: { $sum: { $cond: [{ $eq: ['$mode', 'active'] }, 1, 0] } },
          // 获取服务状态，默认为活跃
          isActive: { 
            $first: { 
              $ifNull: ['$serviceStatus.isActive', true] 
            } 
          },
          lastUpdated: { $max: '$serviceStatus.updatedAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({ services: result });
  } catch (error) {
    console.error('获取服务统计错误:', error);
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

// 更新用户状态（禁用/解禁）
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json(
        createErrorResponse(
          '状态参数必须是布尔值', 
          ERROR_CODES.VALIDATION_FAILED,
          null,
          req.originalUrl
        )
      );
    }
    
    // 验证用户ID是否有效
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(
        createErrorResponse(
          '无效的用户ID格式', 
          ERROR_CODES.INVALID_FORMAT,
          null,
          req.originalUrl
        )
      );
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(
        createErrorResponse(
          '用户不存在', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 防止管理员禁用自己
    if (String(user._id) === String(req.user._id)) {
      return res.status(403).json(
        createErrorResponse(
          '不能修改自己的账户状态', 
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          null,
          req.originalUrl
        )
      );
    }
    
    user.isActive = isActive;
    
    // 如果是解禁用户，重置登录失败计数
    if (isActive) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }
    
    await user.save();
    
    res.json({
      message: `用户${isActive ? '解禁' : '禁用'}成功`,
      user: {
        id: user._id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('更新用户状态错误:', error);
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

// 发送系统通知
router.post('/notifications/send', async (req, res) => {
  try {
    const { userId, title, content, type = 'info', priority = 'normal' } = req.body;
    
    // 验证必填字段
    if (!userId || !title || !content) {
      return res.status(400).json(
        createErrorResponse(
          '缺少必要参数', 
          ERROR_CODES.MISSING_REQUIRED_FIELDS,
          null,
          req.originalUrl
        )
      );
    }
    
    // 验证用户ID是否有效
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json(
        createErrorResponse(
          '无效的用户ID格式', 
          ERROR_CODES.INVALID_FORMAT,
          null,
          req.originalUrl
        )
      );
    }
    
    // 验证类型和优先级是否有效
    const validTypes = ['info', 'warning', 'error', 'success'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json(
        createErrorResponse(
          '无效的通知类型', 
          ERROR_CODES.VALIDATION_FAILED,
          null,
          req.originalUrl
        )
      );
    }
    
    if (!validPriorities.includes(priority)) {
      return res.status(400).json(
        createErrorResponse(
          '无效的优先级', 
          ERROR_CODES.VALIDATION_FAILED,
          null,
          req.originalUrl
        )
      );
    }
    
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(
        createErrorResponse(
          '用户不存在', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 创建系统通知
    const notification = new Notification({
      userId: user._id,
      title,
      content,
      type,
      priority,
      isSystemNotification: true, // 标记为系统通知
      source: req.body.source || { name: '系统通知' },
      metadata: req.body.metadata || {
        sender: {
          admin: req.user.username,
          adminId: req.user._id
        },
        systemNotification: true
      },
      // 为系统通知生成唯一的externalId，避免重复键错误
      externalId: `system-${new mongoose.Types.ObjectId().toString()}`
    });
    
    await notification.save();
    
    res.status(201).json({
      message: '系统通知发送成功',
      notification: {
        id: notification._id,
        title: notification.title,
        receivedAt: notification.receivedAt
      }
    });
  } catch (error) {
    console.error('发送系统通知错误:', error);
    
    // 处理验证错误
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        createErrorResponse(
          '通知数据验证失败', 
          ERROR_CODES.DATA_VALIDATION_FAILED,
          { details: Object.values(error.errors).map(e => e.message).join(', ') },
          req.originalUrl
        )
      );
    }
    
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        req.originalUrl
      )
    );
  }
});

// 更新服务状态（禁用/解禁）
router.patch('/services/status', async (req, res) => {
  try {
    const { serviceId, isActive } = req.body;
    
    if (!serviceId) {
      return res.status(400).json(
        createErrorResponse(
          '缺少服务ID', 
          ERROR_CODES.MISSING_REQUIRED_FIELDS,
          null,
          req.originalUrl
        )
      );
    }
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json(
        createErrorResponse(
          '状态参数必须是布尔值', 
          ERROR_CODES.VALIDATION_FAILED,
          null,
          req.originalUrl
        )
      );
    }
    
    // 使用服务ID（主机名）查找相关的订阅并更新状态
    // 注意：我们在更新服务状态，但实际上是对serviceHost为该ID的所有订阅进行操作
    
    const result = await Subscription.updateMany(
      { serviceHost: serviceId },
      { 
        $set: { 
          serviceStatus: {
            isActive: isActive,
            updatedAt: new Date(),
            updatedBy: req.user._id
          } 
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json(
        createErrorResponse(
          '未找到该服务', 
          ERROR_CODES.RESOURCE_NOT_FOUND,
          null,
          req.originalUrl
        )
      );
    }
    
    // 获取一个受影响的服务名称
    const serviceInfo = await Subscription.findOne({ serviceHost: serviceId });
    const serviceName = serviceInfo ? serviceInfo.thirdPartyName : serviceId;
    
    res.json({
      message: `服务${isActive ? '解禁' : '禁用'}成功`,
      service: {
        id: serviceId,
        name: serviceName,
        isActive: isActive,
        affectedSubscriptions: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('更新服务状态错误:', error);
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