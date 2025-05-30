const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const config = require('./config/config');
const PollingService = require('./services/PollingService');
const path = require('path');

// 导入路由
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const notificationRoutes = require('./routes/notifications');
const externalRoutes = require('./routes/external');
const adminRoutes = require('./routes/admin');

const app = express();

// 连接数据库
connectDB();

// 安全中间件 - 配置CSP以允许外部CDN
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS配置
app.use(cors({
  origin: config.nodeEnv === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// JSON解析中间件 - 移到前面，确保rate limiting能访问req.body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 特殊的通知接收端点，更严格的速率限制
const notificationLimiter = rateLimit({
  windowMs: 60000, // 1分钟
  max: 60, // 每分钟最多60个通知
  message: '通知发送过于频繁',
  keyGenerator: (req) => {
    // 基于token生成限制key，添加错误处理
    try {
      return (req.body && req.body.token) ? `token:${req.body.token.substring(0, 10)}` : `ip:${req.ip}`;
    } catch (error) {
      console.warn('速率限制密钥加生器错误：', error);
      return `ip:${req.ip}`;
    }
  }
});
app.use('/api/notifications/receive', notificationLimiter);

// 静态文件服务
app.use(express.static('public'));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/external', externalRoutes);

// 管理员路由 - 仅当配置启用时才加载
if (config.admin.enabled) {
  app.use('/api/admin', adminRoutes);
  console.log('🔐 管理员功能已启用');
  
  if (config.admin.emails.length > 0) {
    console.log(`👤 管理员邮箱: ${config.admin.emails.join(', ')}`);
  } else {
    console.warn('⚠️ 警告: 未配置管理员邮箱，请设置 ADMIN_EMAILS 环境变量');
  }
}

// 特殊处理 /admin 路径
app.get('/admin', (req, res) => {
  if (config.admin.enabled) {
    res.sendFile(path.join(__dirname, 'admin.html'));
  } else {
    // 管理员功能未启用，返回404
    res.status(404).json({
      error: '接口不存在',
      path: req.originalUrl,
      method: req.method
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// API信息端点
app.get('/api', (req, res) => {
  res.json({
    name: '回声 (Huisheen) API',
    version: '1.0.0',
    description: '专注于通知接收的服务平台',
    documentation: '/docs',
    endpoints: {
      auth: '/api/auth',
      subscriptions: '/api/subscriptions',
      notifications: '/api/notifications'
    }
  });
});

// 前端路由支持 - 所有非API请求都返回主页面
app.get('*', (req, res) => {
  // 排除API路径和静态资源
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/health') || 
      req.path.includes('.')) {
    return res.status(404).json({
      error: '接口不存在',
      path: req.originalUrl,
      method: req.method
    });
  }
  
  // 返回主页面，让前端路由处理
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  
  // 开发环境返回详细错误信息
  if (config.nodeEnv === 'development') {
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
      stack: error.stack
    });
  } else {
    res.status(500).json({
      error: '服务器内部错误'
    });
  }
});

// 启动服务器
const server = app.listen(config.port, () => {
  console.log(`🚀 回声服务器启动成功`);
  console.log(`📍 服务地址: http://localhost:${config.port}`);
  console.log(`🌍 环境: ${config.nodeEnv}`);
  console.log(`📊 数据库: ${config.mongoUri}`);
  
  // 启动轮询服务
  setTimeout(() => {
    PollingService.start();
  }, 5000); // 延迟5秒启动轮询服务
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，开始优雅关闭...');
  PollingService.stop();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，开始优雅关闭...');
  PollingService.stop();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app; 