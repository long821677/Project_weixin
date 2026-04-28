/**
 * 小程序入口文件
 * 负责初始化云开发环境和全局配置
 */

App({
  /**
   * 小程序启动时执行
   * 初始化云开发环境
   */
  onLaunch: function () {
    // 判断是否支持云开发
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发，请升级微信版本');
      return;
    }

    // 简化的云开发初始化
    try {
      wx.cloud.init({
        env: 'cloud1-8gpfi24n17c695d5',
        traceUser: true,
        timeout: 15000
      });
      
      // 尝试获取数据库引用
      this.db = wx.cloud.database();
      console.log('云开发环境初始化成功');
    } catch (error) {
      console.error('云开发初始化失败:', error);
      // 初始化失败不影响小程序运行，后续操作会使用模拟数据
    }
  },

  /**
   * 小程序显示时执行
   */
  onShow: function () {
    console.log('小程序显示');
  },

  /**
   * 小程序隐藏时执行
   */
  onHide: function () {
    console.log('小程序隐藏');
  },

  /**
   * 全局数据存储
   */
  globalData: {
    userInfo: null,
    downloadToken: null
  },

  /**
   * 云数据库引用（全局可用）
   */
  db: null
});