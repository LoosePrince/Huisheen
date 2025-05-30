const express = require('express');
const mongoose = require('mongoose');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');

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
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取所有用户列表（后续可以添加分页）
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
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
          activeMode: { $sum: { $cond: [{ $eq: ['$mode', 'active'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({ services: result });
  } catch (error) {
    console.error('获取服务统计错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 