require('dotenv').config();

// 调试信息：显示所有环境变量（生产环境中应该移除）
if (process.env.NODE_ENV !== 'production') {
  console.log('环境变量调试信息:');
  console.log('MONGODB_URI存在:', !!process.env.MONGODB_URI);
  console.log('JWT_SECRET存在:', !!process.env.JWT_SECRET);
  console.log('MONGO_URL存在:', !!process.env.MONGO_URL);
}

// Railway特殊处理：如果MONGODB_URI不存在但MONGO_URL存在，使用MONGO_URL
if (!process.env.MONGODB_URI && process.env.MONGO_URL) {
  process.env.MONGODB_URI = process.env.MONGO_URL;
  console.log('使用Railway的MONGO_URL作为MONGODB_URI');
}

// 检查必需的环境变量
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('错误：缺少必需的环境变量:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('请创建.env文件并配置这些变量，或在环境中设置它们。');
  
  // 提供Railway特别说明
  if (process.env.NODE_ENV === 'production') {
    console.error('\nRailway部署说明:');
    console.error('1. 确保已添加MongoDB服务到项目中');
    console.error('2. 设置环境变量 MONGODB_URI=${{MONGO_URL}}');
    console.error('3. 或者直接设置 MONGODB_URI 为外部MongoDB连接字符串');
  }
  
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  verificationCodeExpiresMinutes: parseInt(process.env.VERIFICATION_CODE_EXPIRES_MINUTES) || 5,
  pollingIntervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES) || 5,
  nodeEnv: process.env.NODE_ENV || 'development',
  websiteDomain: process.env.WEBSITE_DOMAIN || 'localhost:3000',
  
  // 管理员配置
  admin: {
    enabled: process.env.ADMIN_ENABLED === 'true' || false,
    emails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : []
  },
  
  // 邮件服务配置
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail', // 邮件服务提供商
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || '', // 发送邮件的账户
      pass: process.env.EMAIL_PASS || ''  // 应用密码或邮箱密码
    },
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@huisheen.com' // 发件人地址
  }
}; 