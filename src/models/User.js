const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  notifyId: {
    type: String,
    unique: true,
    default: function() {
      return uuidv4().replace(/-/g, '').substring(0, 12).replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
    }
  },
  verificationCode: {
    type: String,
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  verificationCodeExpires: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // 管理员角色
  isAdmin: {
    type: Boolean,
    default: false
  },
  // 邮箱验证相关字段
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// 加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 生成用户标识码
userSchema.methods.generateNotifyCode = function() {
  // 生成6位数字和字母组合的验证码
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let verificationCode = '';
  for (let i = 0; i < 6; i++) {
    verificationCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  this.verificationCode = verificationCode;
  this.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期
  
  return `notify:user:${this.notifyId}:${verificationCode}@${config.websiteDomain}`;
};

// 验证标识码
userSchema.methods.verifyNotifyCode = function(code) {
  const now = new Date();
  return this.verificationCode === code && this.verificationCodeExpires > now;
};

// 生成邮箱验证码
userSchema.methods.generateEmailVerificationCode = function() {
  // 生成6位数字验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.emailVerificationCode = code;
  this.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
  this.emailVerificationAttempts = 0; // 重置尝试次数
  
  return code;
};

// 验证邮箱验证码
userSchema.methods.verifyEmailCode = function(code) {
  const now = new Date();
  
  // 检查验证码是否存在和未过期
  if (!this.emailVerificationCode || !this.emailVerificationExpires) {
    return { success: false, message: '验证码不存在' };
  }
  
  if (this.emailVerificationExpires < now) {
    return { success: false, message: '验证码已过期' };
  }
  
  // 检查尝试次数
  if (this.emailVerificationAttempts >= 5) {
    return { success: false, message: '验证尝试次数过多，请重新获取验证码' };
  }
  
  // 验证码错误
  if (this.emailVerificationCode !== code) {
    this.emailVerificationAttempts += 1;
    return { success: false, message: '验证码错误' };
  }
  
  // 验证成功
  this.isEmailVerified = true;
  this.emailVerificationCode = undefined;
  this.emailVerificationExpires = undefined;
  this.emailVerificationAttempts = 0;
  
  return { success: true, message: '邮箱验证成功' };
};

// 计算用户存储使用情况
userSchema.methods.getStorageUsage = async function() {
  const mongoose = require('mongoose');
  const Notification = mongoose.model('Notification');
  const Subscription = mongoose.model('Subscription');
  
  try {
    // 获取用户的所有通知
    const notifications = await Notification.find({ userId: this._id });
    
    // 获取用户的所有订阅
    const subscriptions = await Subscription.find({ userId: this._id });
    
    // 计算通知数据大小
    let notificationsSize = 0;
    notifications.forEach(notification => {
      // 计算每个字段的大小（字符串按UTF-8编码计算）
      const title = notification.title || '';
      const content = notification.content || '';
      const type = notification.type || '';
      const priority = notification.priority || '';
      const sourceName = notification.source?.name || '';
      const sourceUrl = notification.source?.url || '';
      const sourceIcon = notification.source?.icon || '';
      const callbackUrl = notification.callbackUrl || '';
      const externalId = notification.externalId || '';
      
      // 计算metadata和rawData的JSON字符串大小
      const metadata = notification.metadata ? JSON.stringify(notification.metadata) : '';
      const rawData = notification.rawData ? JSON.stringify(notification.rawData) : '';
      
      // 累加大小（UTF-8编码，中文字符约3字节）
      notificationsSize += Buffer.byteLength(title, 'utf8');
      notificationsSize += Buffer.byteLength(content, 'utf8');
      notificationsSize += Buffer.byteLength(type, 'utf8');
      notificationsSize += Buffer.byteLength(priority, 'utf8');
      notificationsSize += Buffer.byteLength(sourceName, 'utf8');
      notificationsSize += Buffer.byteLength(sourceUrl, 'utf8');
      notificationsSize += Buffer.byteLength(sourceIcon, 'utf8');
      notificationsSize += Buffer.byteLength(callbackUrl, 'utf8');
      notificationsSize += Buffer.byteLength(externalId, 'utf8');
      notificationsSize += Buffer.byteLength(metadata, 'utf8');
      notificationsSize += Buffer.byteLength(rawData, 'utf8');
      
      // 其他字段的估算大小（ObjectId, Date, Boolean等）
      notificationsSize += 100; // 基础字段大小估算
    });
    
    // 计算订阅数据大小
    let subscriptionsSize = 0;
    subscriptions.forEach(subscription => {
      const serviceHost = subscription.serviceHost || '';
      const thirdPartyName = subscription.thirdPartyName || '';
      const thirdPartyUrl = subscription.thirdPartyUrl || '';
      const mode = subscription.mode || '';
      const apiEndpoint = subscription.apiEndpoint || '';
      const token = subscription.token || '';
      const config = subscription.config ? JSON.stringify(subscription.config) : '';
      
      subscriptionsSize += Buffer.byteLength(serviceHost, 'utf8');
      subscriptionsSize += Buffer.byteLength(thirdPartyName, 'utf8');
      subscriptionsSize += Buffer.byteLength(thirdPartyUrl, 'utf8');
      subscriptionsSize += Buffer.byteLength(mode, 'utf8');
      subscriptionsSize += Buffer.byteLength(apiEndpoint, 'utf8');
      subscriptionsSize += Buffer.byteLength(token, 'utf8');
      subscriptionsSize += Buffer.byteLength(config, 'utf8');
      
      // 其他字段的估算大小
      subscriptionsSize += 80; // 基础字段大小估算
    });
    
    const totalSize = notificationsSize + subscriptionsSize;
    
    // 基础存储上限（默认1MB）
    let baseSize = 1024 * 1024; // 1MB
    
    // 额外存储奖励计算
    let extraSize = 0;
    let extraSizeInfo = [];
    
    // 1. 验证邮箱奖励：增加1MB存储空间
    if (this.isEmailVerified) {
      extraSize += 1024 * 1024; // +1MB
      extraSizeInfo.push({
        reason: 'email_verified',
        size: 1024 * 1024,
        description: '邮箱验证奖励'
      });
      
      // 2. 提供服务奖励：如果已验证邮箱，每提供一个服务增加5MB，最多计算两个
      if (this.isEmailVerified) {
        // 获取当前用户的通知ID
        const userNotifyId = this.notifyId;
        
        // 计算用户提供的服务数量
        const myServices = [];
        for (const sub of subscriptions) {
          // 获取服务配置中的owner_notify_id
          const ownerNotifyId = sub.config?.serviceInfo?.owner_notify_id;
          
          // 如果当前用户是服务所有者，则计入统计
          if (ownerNotifyId && ownerNotifyId === userNotifyId) {
            const serviceKey = sub.serviceHost;
            
            // 如果这个服务还没有被计算过，添加到服务列表
            if (!myServices.includes(serviceKey)) {
              myServices.push(serviceKey);
            }
          }
        }
        
        // 计算服务提供的额外存储空间（最多两个服务）
        const serviceCount = Math.min(myServices.length, 2);
        if (serviceCount > 0) {
          const serviceExtraSize = serviceCount * 5 * 1024 * 1024; // 每个服务+5MB
          extraSize += serviceExtraSize;
          extraSizeInfo.push({
            reason: 'service_provider',
            size: serviceExtraSize,
            count: serviceCount,
            services: myServices.slice(0, 2), // 最多显示两个服务
            description: `提供服务奖励 (${serviceCount}个服务)`
          });
        }
      }
    }
    
    // 总存储上限 = 基础 + 额外奖励
    const maxSize = baseSize + extraSize;
    const usagePercentage = Math.min((totalSize / maxSize) * 100, 100);
    
    return {
      notifications: {
        count: notifications.length,
        size: notificationsSize
      },
      subscriptions: {
        count: subscriptions.length,
        size: subscriptionsSize
      },
      total: {
        size: totalSize,
        baseSize: baseSize,
        extraSize: extraSize,
        extraSizeInfo: extraSizeInfo,
        maxSize: maxSize,
        usagePercentage: usagePercentage,
        remainingSize: Math.max(maxSize - totalSize, 0)
      }
    };
  } catch (error) {
    console.error('计算存储使用情况时出错:', error);
    return {
      notifications: { count: 0, size: 0 },
      subscriptions: { count: 0, size: 0 },
      total: { 
        size: 0, 
        baseSize: 1024 * 1024, 
        extraSize: 0,
        extraSizeInfo: [],
        maxSize: 1024 * 1024, 
        usagePercentage: 0, 
        remainingSize: 1024 * 1024 
      }
    };
  }
};

module.exports = mongoose.model('User', userSchema); 