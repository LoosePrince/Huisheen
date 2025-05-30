#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 回声平台环境配置向导');
console.log('==============================\n');

// 检查.env文件是否已存在
if (fs.existsSync('.env')) {
  console.log('⚠️  .env文件已存在！');
  console.log('如果继续，将会覆盖现有配置。');
  console.log('建议先备份现有的.env文件。\n');
}

// 生成强随机JWT密钥
const jwtSecret = crypto.randomBytes(64).toString('hex');

// 读取模板文件
let template;
try {
  template = fs.readFileSync('config.env.example', 'utf8');
} catch (error) {
  console.error('❌ 无法读取配置模板文件 config.env.example');
  console.error('请确保文件存在且有读取权限。');
  process.exit(1);
}

// 替换JWT密钥为生成的强密钥
const envContent = template.replace(
  'your_jwt_secret_key_here_change_in_production_very_important',
  jwtSecret
);

// 写入.env文件
try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env文件创建成功！');
  console.log('\n📋 配置摘要：');
  console.log('- NODE_ENV: development');
  console.log('- PORT: 3000');
  console.log('- MONGODB_URI: mongodb://localhost:27017/Huisheen');
  console.log('- JWT_SECRET: [已生成强随机密钥]');
  console.log('- WEBSITE_DOMAIN: localhost:3000');
  
  console.log('\n🔧 下一步：');
  console.log('1. 检查并修改 .env 文件中的数据库连接信息');
  console.log('2. 确保MongoDB服务正在运行');
  console.log('3. 运行 npm start 启动应用');
  
  console.log('\n⚠️  重要提醒：');
  console.log('- .env文件包含敏感信息，请勿提交到版本控制');
  console.log('- 生产环境请使用更安全的数据库连接和JWT密钥');
  console.log('- 定期更换JWT密钥以提高安全性');
  
} catch (error) {
  console.error('❌ 创建.env文件失败：', error.message);
  process.exit(1);
}

console.log('\n�� 配置完成！回声平台已准备就绪。'); 