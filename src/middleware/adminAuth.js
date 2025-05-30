const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '访问被拒绝，需要登录Token' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: '无效的Token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: '账户已被禁用' });
    }

    // 检查是否为管理员
    if (!user.isAdmin) {
      return res.status(403).json({ error: '权限不足，需要管理员权限' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token验证失败' });
  }
};

module.exports = adminAuth; 