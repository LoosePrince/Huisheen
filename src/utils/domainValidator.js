const config = require('../config/config');

/**
 * 检查域名是否为本地开发域名
 * @param {string} domain - 要检查的域名
 * @returns {boolean} - 是否为本地域名
 */
function isLocalDomain(domain) {
  const localDomains = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1'
  ];
  
  // 检查是否是localhost加端口的形式
  const localhostWithPort = /^localhost:\d+$/.test(domain);
  const ipWithPort = /^(127\.0\.0\.1|0\.0\.0\.0):\d+$/.test(domain);
  
  return localDomains.includes(domain) || localhostWithPort || ipWithPort;
}

/**
 * 检查URL是否为本地URL
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为本地URL
 */
function isLocalUrl(url) {
  try {
    const urlObj = new URL(url);
    return isLocalDomain(urlObj.host);
  } catch (error) {
    return false;
  }
}

/**
 * 验证通知标识码中的域名是否有效
 * @param {string} notifyCode - 完整的通知标识码
 * @returns {object} - 验证结果 {isValid: boolean, error?: string}
 */
function validateNotifyCodeDomain(notifyCode) {
  // 提取域名部分
  const atIndex = notifyCode.indexOf('@');
  if (atIndex === -1) {
    return {
      isValid: false,
      error: '通知标识码必须包含域名'
    };
  }
  
  const domain = notifyCode.substring(atIndex + 1);
  const configuredDomain = config.websiteDomain;
  
  // 如果域名完全匹配，直接通过
  if (domain === configuredDomain) {
    return { isValid: true };
  }
  
  // 检查配置的域名是否为本地域名
  const configIsLocal = isLocalDomain(configuredDomain);
  const requestIsLocal = isLocalDomain(domain);
  
  // 只有当配置的域名是本地域名时，才允许其他本地域名
  if (configIsLocal && requestIsLocal) {
    return { isValid: true };
  }
  
  // 生产环境严格验证域名匹配
  return {
    isValid: false,
    error: `域名不匹配。期望: ${configuredDomain}，实际: ${domain}。${
      !configIsLocal ? '生产环境要求严格的域名匹配。' : ''
    }`
  };
}

/**
 * 验证第三方URL是否有效
 * @param {string} url - 第三方提供的URL
 * @returns {object} - 验证结果 {isValid: boolean, error?: string}
 */
function validateThirdPartyUrl(url) {
  // 首先检查URL格式是否有效
  try {
    new URL(url);
  } catch (error) {
    return {
      isValid: false,
      error: '请输入有效的URL格式'
    };
  }
  
  const configuredDomain = config.websiteDomain;
  const configIsLocal = isLocalDomain(configuredDomain);
  const urlIsLocal = isLocalUrl(url);
  
  // 如果配置为生产域名，但第三方URL是本地地址，则不允许
  if (!configIsLocal && urlIsLocal) {
    return {
      isValid: false,
      error: '生产环境不允许使用本地URL作为第三方服务地址'
    };
  }
  
  // 其他情况都允许
  return { isValid: true };
}

module.exports = {
  isLocalDomain,
  isLocalUrl,
  validateNotifyCodeDomain,
  validateThirdPartyUrl
}; 