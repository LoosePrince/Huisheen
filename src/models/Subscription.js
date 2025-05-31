const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 服务识别 - 使用主机名而不是名称
  serviceHost: {
    type: String,
    required: true,
    trim: true,
    lowercase: true // 确保一致性
  },
  thirdPartyName: {
    type: String,
    required: true,
    trim: true
  },
  thirdPartyUrl: {
    type: String,
    required: true,
    trim: true
  },
  mode: {
    type: String,
    enum: ['passive', 'active'],
    required: true
  },
  // 被动模式相关字段
  apiEndpoint: {
    type: String,
    trim: true
  },
  pollingInterval: {
    type: Number, // 分钟
    default: 5
  },
  lastPolled: {
    type: Date
  },
  lastManualTrigger: {
    type: Date
  },
  // 主动模式相关字段
  token: {
    type: String,
    unique: true,
    sparse: true
  },
  // 通用字段
  isActive: {
    type: Boolean,
    default: true
  },
  // 服务状态（用于管理员控制）
  serviceStatus: {
    isActive: {
      type: Boolean,
      default: true
    },
    updatedAt: {
      type: Date
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    }
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  lastNotificationAt: {
    type: Date
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  // 第三方提供的配置
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// 为被动模式生成token
subscriptionSchema.methods.generateToken = function() {
  const payload = {
    subscriptionId: this._id,
    userId: this.userId,
    thirdPartyName: this.thirdPartyName,
    mode: this.mode
  };
  
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '365d' });
  this.token = token;
  return token;
};

// 验证token
subscriptionSchema.statics.verifyToken = function(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

// 复合索引 - 使用服务主机名来识别同一服务的不同模式
subscriptionSchema.index({ userId: 1, serviceHost: 1, mode: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema); 