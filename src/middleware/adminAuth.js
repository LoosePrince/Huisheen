const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { ERROR_CODES, createErrorResponse } = require('../utils/errorHandler');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          '访问被拒绝，需要登录Token', 
          ERROR_CODES.AUTHENTICATION_FAILED,
          null,
          req.originalUrl
        )
      );
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json(
          createErrorResponse(
            '无效的Token', 
            ERROR_CODES.INVALID_TOKEN,
            null,
            req.originalUrl
          )
        );
      }

      if (!user.isActive) {
        return res.status(401).json(
          createErrorResponse(
            '账户已被禁用', 
            ERROR_CODES.ACCOUNT_DISABLED,
            null,
            req.originalUrl
          )
        );
      }

      // 检查是否为管理员
      if (!user.isAdmin) {
        return res.status(403).json(
          createErrorResponse(
            '权限不足，需要管理员权限', 
            ERROR_CODES.PERMISSION_DENIED,
            null,
            req.originalUrl
          )
        );
      }

      req.user = user;
      next();
    } catch (jwtError) {
      // 处理JWT错误
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json(
          createErrorResponse(
            'Token已过期', 
            ERROR_CODES.TOKEN_EXPIRED,
            null,
            req.originalUrl
          )
        );
      } else {
        return res.status(401).json(
          createErrorResponse(
            'Token验证失败', 
            ERROR_CODES.INVALID_TOKEN,
            null,
            req.originalUrl
          )
        );
      }
    }
  } catch (error) {
    console.error('管理员认证中间件错误:', error);
    res.status(500).json(
      createErrorResponse(
        '服务器内部错误', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
};

module.exports = adminAuth; 