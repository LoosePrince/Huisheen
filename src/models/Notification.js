const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  source: {
    name: {
      type: String,
      required: true
    },
    url: {
      type: String
    },
    icon: {
      type: String
    }
  },
  // 回调链接，点击通知时跳转
  callbackUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  // 用于去重
  externalId: {
    type: String,
    trim: true
  },
  // 第三方原始数据
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 标记为已读
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// 复合索引用于去重和查询优化
notificationSchema.index({ subscriptionId: 1, externalId: 1 }, { unique: true, sparse: true });
notificationSchema.index({ userId: 1, receivedAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, receivedAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema); 