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

module.exports = mongoose.model('User', userSchema); 