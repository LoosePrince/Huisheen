require('dotenv').config();

// 检查必需的环境变量
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('错误：缺少必需的环境变量:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('请创建.env文件并配置这些变量，或在环境中设置它们。');
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
  websiteDomain: process.env.WEBSITE_DOMAIN || 'localhost:3000'
}; 