/**
 * 统一错误处理工具
 * 用于生成标准化的API错误响应
 */

// 错误代码常量
const ERROR_CODES = {
  // 验证和参数错误
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',     // 请求参数验证失败
  VALIDATION_FAILED: 'VALIDATION_FAILED',       // 数据验证失败
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD', // 缺少必需字段
  INVALID_FORMAT: 'INVALID_FORMAT',             // 格式错误
  INVALID_EMAIL: 'INVALID_EMAIL',               // 无效的邮箱格式
  INVALID_URL: 'INVALID_URL',                   // 无效的URL格式
  INVALID_DATE: 'INVALID_DATE',                 // 无效的日期格式
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',             // 值超过最大长度
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',           // 值低于最小长度
  NUMERIC_VALUE_TOO_LARGE: 'NUMERIC_VALUE_TOO_LARGE', // 数值太大
  NUMERIC_VALUE_TOO_SMALL: 'NUMERIC_VALUE_TOO_SMALL', // 数值太小
  
  // 认证和授权错误
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED', // 认证失败
  INVALID_TOKEN: 'INVALID_TOKEN',               // 无效的Token
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',               // Token已过期
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',   // 凭据无效（用户名/密码错误）
  PERMISSION_DENIED: 'PERMISSION_DENIED',       // 权限不足
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',         // 账户已禁用
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',             // 账户已锁定（多次登录失败）
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',         // 密码已过期
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',     // 邮箱未验证
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN', // 无效的刷新令牌
  SESSION_EXPIRED: 'SESSION_EXPIRED',           // 会话已过期
  
  // 资源错误
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',     // 请求的资源不存在
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS', // 资源已存在
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',       // 资源冲突
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',     // 资源已用尽（如存储空间）
  RESOURCE_DELETED: 'RESOURCE_DELETED',         // 资源已删除
  RESOURCE_DISABLED: 'RESOURCE_DISABLED',       // 资源已禁用
  RESOURCE_EXPIRED: 'RESOURCE_EXPIRED',         // 资源已过期
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',           // 资源已锁定（被其他操作占用）
  
  // 操作错误
  OPERATION_FAILED: 'OPERATION_FAILED',         // 操作失败
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',   // 超出请求频率限制
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',       // 请求过多
  OPERATION_UNAUTHORIZED: 'OPERATION_UNAUTHORIZED', // 操作未授权
  OPERATION_TIMED_OUT: 'OPERATION_TIMED_OUT',   // 操作超时
  OPERATION_UNSUPPORTED: 'OPERATION_UNSUPPORTED', // 不支持的操作
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',   // 操作已取消
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED', // 操作不允许
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',             // 配额超出
  
  // 通知相关错误
  NOTIFICATION_SEND_FAILED: 'NOTIFICATION_SEND_FAILED', // 通知发送失败
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',     // 订阅错误
  POLLING_ERROR: 'POLLING_ERROR',               // 轮询错误
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND', // 通知不存在
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND', // 订阅不存在
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED', // 订阅已过期
  PUSH_TOKEN_INVALID: 'PUSH_TOKEN_INVALID',     // 推送令牌无效
  NOTIFICATION_THROTTLED: 'NOTIFICATION_THROTTLED', // 通知被限流
  CALLBACK_URL_UNREACHABLE: 'CALLBACK_URL_UNREACHABLE', // 回调URL不可达
  
  // 外部服务错误
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR', // 外部服务错误
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',     // 外部API错误
  THIRD_PARTY_REQUEST_FAILED: 'THIRD_PARTY_REQUEST_FAILED', // 第三方请求失败
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',       // 集成错误
  API_GATEWAY_ERROR: 'API_GATEWAY_ERROR',       // API网关错误
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED', // Webhook传递失败
  
  // 数据错误
  DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED', // 数据验证失败
  DATA_INTEGRITY_ERROR: 'DATA_INTEGRITY_ERROR', // 数据完整性错误
  DATA_FORMAT_ERROR: 'DATA_FORMAT_ERROR',       // 数据格式错误
  DATA_PROCESSING_ERROR: 'DATA_PROCESSING_ERROR', // 数据处理错误
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',           // 重复条目
  
  // 服务端错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',             // 服务器内部错误
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',   // 服务不可用
  DATABASE_ERROR: 'DATABASE_ERROR',             // 数据库错误
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR', // 数据库连接错误
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',         // 数据库超时
  DATABASE_QUERY_ERROR: 'DATABASE_QUERY_ERROR', // 数据库查询错误
  NETWORK_ERROR: 'NETWORK_ERROR',               // 网络错误
  SERVER_OVERLOADED: 'SERVER_OVERLOADED',       // 服务器过载
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',         // 维护模式
  SERVICE_DEPRECATED: 'SERVICE_DEPRECATED',     // 服务已弃用
  CONFIG_ERROR: 'CONFIG_ERROR',                 // 配置错误
  
  // 安全错误
  SECURITY_ERROR: 'SECURITY_ERROR',             // 安全错误
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',     // CSRF令牌无效
  IP_BLOCKED: 'IP_BLOCKED',                     // IP被阻止
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',   // 可疑活动
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',         // 加密错误
  WEAK_PASSWORD: 'WEAK_PASSWORD',               // 密码强度不足
  ACCOUNT_COMPROMISED: 'ACCOUNT_COMPROMISED',   // 账户可能被盗用
  
  // 文件和上传错误
  FILE_ERROR: 'FILE_ERROR',                     // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',             // 文件不存在
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',             // 文件过大
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE', // 不支持的文件类型
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',     // 文件上传失败
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED', // 存储配额超出
};

/**
 * 创建标准化的错误响应对象
 * @param {string} message - 错误描述信息
 * @param {string} code - 错误代码，使用ERROR_CODES中的常量
 * @param {object|array} details - 详细错误信息
 * @param {string} path - 发生错误的API路径
 * @returns {object} 标准化的错误响应对象
 */
const createErrorResponse = (message, code, details = null, path = null) => {
  const errorResponse = {
    error: message,
    code: code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    errorResponse.details = details;
  }

  if (path) {
    errorResponse.path = path;
  }

  return errorResponse;
};

/**
 * 创建验证错误响应
 * @param {array} validationErrors - 验证错误数组
 * @returns {object} 标准化的验证错误响应对象
 */
const createValidationErrorResponse = (validationErrors, path = null) => {
  return createErrorResponse(
    '数据验证失败',
    ERROR_CODES.VALIDATION_FAILED,
    validationErrors.map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    })),
    path
  );
};

/**
 * 处理并记录错误
 * @param {Error} error - 错误对象
 * @param {string} context - 错误发生的上下文
 * @returns {object} 标准化的错误响应对象
 */
const handleError = (error, context = '') => {
  // 记录错误
  console.error(`${context || '错误'}:`, error);
  
  // 创建标准错误响应
  return createErrorResponse(
    '服务器内部错误',
    ERROR_CODES.INTERNAL_ERROR
  );
};

module.exports = {
  ERROR_CODES,
  createErrorResponse,
  createValidationErrorResponse,
  handleError
}; 