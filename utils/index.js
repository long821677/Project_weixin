/**
 * 工具函数模块
 * 提供通用工具方法
 */

/**
 * 生成唯一Token
 * 使用时间戳+随机数+MD5加密
 * @returns {string} 32位唯一Token
 */
export function generateToken() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  const uuid = `${timestamp}${random}`;
  return uuid;
}

/**
 * 生成带token的分享链接
 * @param {string} token - 下载token
 * @returns {string} 完整分享链接
 */
export function generateShareUrl(token) {
  // 小程序页面路径
  const pagePath = '/pages/download/index';
  // 构建带参数的链接
  const shareUrl = `${pagePath}?token=${token}`;
  return shareUrl;
}

/**
 * 格式化文件大小
 * @param {number} size - 文件大小（字节）
 * @returns {string} 格式化后的文件大小字符串
 */
export function formatFileSize(size) {
  if (size <= 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(size) / Math.log(k));
  
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * 格式化时间
 * @param {number} timestamp - 时间戳（毫秒）
 * @param {string} format - 格式化字符串
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  const date = new Date(timestamp);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 计算剩余下载次数
 * @param {number} maxDownloads - 最大下载次数
 * @param {number} currentDownloads - 当前下载次数
 * @returns {number} 剩余下载次数
 */
export function getRemainingDownloads(maxDownloads, currentDownloads) {
  return Math.max(0, maxDownloads - currentDownloads);
}

/**
 * 检查链接是否过期
 * @param {number} expireTime - 过期时间戳（毫秒）
 * @returns {boolean} true表示已过期
 */
export function isExpired(expireTime) {
  return Date.now() > expireTime;
}

/**
 * 生成唯一文件名（去重）
 * @param {string} originalName - 原始文件名
 * @returns {string} 新的唯一文件名
 */
export function generateUniqueFileName(originalName) {
  const ext = originalName.split('.').pop() || '';
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  
  if (ext) {
    return `${nameWithoutExt}_${timestamp}${random}.${ext}`;
  }
  return `${nameWithoutExt}_${timestamp}${random}`;
}

/**
 * 显示Toast提示
 * @param {string} title - 提示内容
 * @param {string} icon - 图标类型（success/loading/none）
 * @param {number} duration - 显示时长
 */
export function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  });
}

/**
 * 显示加载提示
 * @param {string} title - 加载提示文字
 */
export function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @returns {Promise} Promise对象，resolve表示确认，reject表示取消
 */
export function showModal(title, content) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        if (res.confirm) {
          resolve();
        } else {
          reject();
        }
      },
      fail: reject
    });
  });
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise} Promise对象
 */
export function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: resolve,
      fail: reject
    });
  });
}