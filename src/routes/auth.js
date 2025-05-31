const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const config = require('../config/config');
const emailService = require('../services/emailService');
const { ERROR_CODES, createErrorResponse } = require('../utils/errorHandler');

const router = express.Router();

// 用户注册
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).withMessage('用户名长度必须在3-30个字符之间'),
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 6 }).withMessage('密码长度至少6个字符'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json(
        createErrorResponse(
          '用户名或邮箱已存在', 
          ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          null,
          req.originalUrl
        )
      );
    }

    // 创建新用户
    const user = new User({ username, email, password });
    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        notifyId: user.notifyId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
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

// 用户登录
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').exists().withMessage('密码不能为空'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json(
        createErrorResponse(
          '邮箱或密码错误', 
          ERROR_CODES.INVALID_CREDENTIALS,
          null,
          req.originalUrl
        )
      );
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(
        createErrorResponse(
          '邮箱或密码错误', 
          ERROR_CODES.INVALID_CREDENTIALS,
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

    // 检查邮箱是否已验证 (如果系统要求邮箱验证)
    if (config.requireEmailVerification && !user.isEmailVerified) {
      return res.status(403).json(
        createErrorResponse(
          '邮箱未验证，请先验证邮箱', 
          ERROR_CODES.EMAIL_NOT_VERIFIED,
          null,
          req.originalUrl
        )
      );
    }

    // 检查并设置管理员权限（如果配置了管理员邮箱）
    if (config.admin.enabled && config.admin.emails.includes(user.email.toLowerCase()) && !user.isAdmin) {
      user.isAdmin = true;
      console.log(`已将用户 ${user.email} 设置为管理员`);
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        notifyId: user.notifyId,
        lastLogin: user.lastLogin,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
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

// 获取用户信息
router.get('/me', auth, async (req, res) => {
  try {
    // 获取存储使用情况
    const storageUsage = await req.user.getStorageUsage();
    
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        notifyId: req.user.notifyId,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
        isEmailVerified: req.user.isEmailVerified,
        isAdmin: req.user.isAdmin,
        storageUsage: storageUsage
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
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

// 生成新的通知标识码
router.post('/generate-notify-code', auth, async (req, res) => {
  try {
    const user = req.user;
    const notifyCode = user.generateNotifyCode();
    await user.save();

    res.json({
      message: '通知标识码生成成功',
      notifyCode,
      expiresIn: '5分钟'
    });
  } catch (error) {
    console.error('生成通知标识码错误:', error);
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

// 发送邮箱验证码
router.post('/send-email-verification', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // 检查邮件服务是否可用
    if (!emailService.isAvailable()) {
      return res.status(503).json(
        createErrorResponse(
          '邮件服务暂时不可用，请稍后重试或联系管理员配置邮件服务', 
          ERROR_CODES.SERVICE_UNAVAILABLE,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查是否已经验证
    if (user.isEmailVerified) {
      return res.status(400).json(
        createErrorResponse(
          '邮箱已经验证过了', 
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          null,
          req.originalUrl
        )
      );
    }
    
    // 检查发送频率限制（5分钟内只能发送一次）
    if (user.emailVerificationExpires && user.emailVerificationExpires > new Date()) {
      const remainingTime = Math.ceil((user.emailVerificationExpires - new Date()) / 1000 / 60);
      return res.status(429).json(
        createErrorResponse(
          `请等待 ${remainingTime} 分钟后再重新发送验证码`, 
          ERROR_CODES.NOTIFICATION_THROTTLED,
          { remainingTime },
          req.originalUrl
        )
      );
    }
    
    // 生成验证码
    const verificationCode = user.generateEmailVerificationCode();
    await user.save();
    
    // 发送邮件
    await emailService.sendVerificationEmail(user.email, verificationCode, user.username);
    
    res.json({
      message: '验证码已发送到您的邮箱，请在10分钟内完成验证',
      expiresIn: '10分钟'
    });
  } catch (error) {
    console.error('发送邮箱验证码错误:', error);
    res.status(500).json(
      createErrorResponse(
        error.message || '发送验证码失败', 
        ERROR_CODES.INTERNAL_ERROR,
        null,
        req.originalUrl
      )
    );
  }
});

// 验证邮箱验证码
router.post('/verify-email', [
  body('code').isLength({ min: 6, max: 6 }).withMessage('验证码必须是6位数字'),
  handleValidationErrors
], auth, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;
    
    // 验证邮箱验证码
    const result = user.verifyEmailCode(code);
    
    if (!result.success) {
      // 根据不同的验证失败原因返回不同的错误代码
      if (result.message.includes('验证码已过期')) {
        return res.status(400).json(
          createErrorResponse(
            result.message, 
            ERROR_CODES.RESOURCE_EXPIRED,
            null,
            req.originalUrl
          )
        );
      } else if (result.message.includes('验证码不存在')) {
        return res.status(400).json(
          createErrorResponse(
            result.message, 
            ERROR_CODES.RESOURCE_NOT_FOUND,
            null,
            req.originalUrl
          )
        );
      } else if (result.message.includes('验证尝试次数过多')) {
        return res.status(400).json(
          createErrorResponse(
            result.message, 
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            null,
            req.originalUrl
          )
        );
      } else {
        return res.status(400).json(
          createErrorResponse(
            result.message, 
            ERROR_CODES.VALIDATION_FAILED,
            null,
            req.originalUrl
          )
        );
      }
    }
    
    // 保存验证结果
    await user.save();
    
    res.json({
      message: result.message,
      isEmailVerified: user.isEmailVerified
    });
  } catch (error) {
    console.error('验证邮箱验证码错误:', error);
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

// 获取邮件服务状态（仅用于调试）
router.get('/email-service-status', auth, async (req, res) => {
  try {
    const status = emailService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('获取邮件服务状态错误:', error);
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