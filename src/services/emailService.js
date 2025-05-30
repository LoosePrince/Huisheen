const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initTransporter();
  }

  async initTransporter() {
    try {
      // 如果没有配置邮件用户名，跳过初始化
      if (!config.email.auth.user) {
        console.log('邮件服务未配置：缺少EMAIL_USER环境变量');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: config.email.service,
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass
        }
      });

      // 验证连接配置
      await this.transporter.verify();
      this.initialized = true;
      console.log('邮件服务初始化成功');
    } catch (error) {
      console.error('邮件服务初始化失败:', error.message);
      this.initialized = false;
    }
  }

  async sendVerificationEmail(to, code, username) {
    if (!this.initialized) {
      throw new Error('邮件服务未初始化或配置不正确');
    }

    const subject = '回声 - 邮箱验证';
    const html = this.generateVerificationEmailHTML(code, username);

    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to: to,
        subject: subject,
        html: html
      });

      console.log('验证邮件发送成功:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('发送验证邮件失败:', error);
      throw new Error('发送邮件失败：' + error.message);
    }
  }

  generateVerificationEmailHTML(code, username) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邮箱验证 - 回声</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #2d3748;
        }
        .code-container {
            background-color: #f7fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #667eea;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        .code-label {
            color: #718096;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .warning {
            background-color: #fef5e7;
            border-left: 4px solid #f6ad55;
            padding: 15px 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
        }
        .warning-text {
            color: #c05621;
            font-size: 14px;
            margin: 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .footer-logo {
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 10px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 回声 (Huisheen)</h1>
            <p>通知接收平台</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                你好 <strong>${username}</strong>，
            </div>
            
            <p>感谢您使用回声平台！为了保障您的账户安全，请使用以下验证码完成邮箱验证：</p>
            
            <div class="code-container">
                <div class="code-label">您的验证码是：</div>
                <div class="code">${code}</div>
                <div style="color: #718096; font-size: 12px; margin-top: 10px;">
                    请在 10 分钟内使用此验证码
                </div>
            </div>
            
            <p>如果您没有请求此验证码，请忽略此邮件。您的账户安全不会受到影响。</p>
            
            <div class="warning">
                <p class="warning-text">
                    <strong>安全提示：</strong> 请勿将验证码告诉他人。回声官方不会主动向您索要验证码。
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">回声 (Huisheen)</div>
            <p>专注于通知接收的开源服务平台</p>
            <p>此邮件由系统自动发送，请勿回复</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // 检查服务是否可用
  isAvailable() {
    return this.initialized;
  }

  // 获取服务状态
  getStatus() {
    return {
      initialized: this.initialized,
      configured: !!config.email.auth.user,
      service: config.email.service
    };
  }
}

// 创建单例实例
const emailService = new EmailService();

module.exports = emailService; 