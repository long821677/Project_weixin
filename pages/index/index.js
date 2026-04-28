Page({
  data: {
    isAdmin: false,
    inputPassword: '',
    showPasswordInput: false,
    adminPassword: 'admin123'
  },

  onLoad: function () {
    this.checkAdminStatus();
  },

  checkAdminStatus: function () {
    const isAdmin = wx.getStorageSync('isAdmin') || false;
    this.setData({ isAdmin });
  },

  togglePasswordInput: function () {
    this.setData({ showPasswordInput: !this.data.showPasswordInput });
  },

  onPasswordInput: function (e) {
    this.setData({ inputPassword: e.detail.value });
  },

  verifyAdmin: function () {
    const { inputPassword, adminPassword } = this.data;
    
    if (inputPassword === adminPassword) {
      wx.setStorageSync('isAdmin', true);
      this.setData({ isAdmin: true, showPasswordInput: false, inputPassword: '' });
      wx.showToast({ title: '验证成功', icon: 'success' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
    }
  },

  logoutAdmin: function () {
    wx.setStorageSync('isAdmin', false);
    this.setData({ isAdmin: false });
    wx.showToast({ title: '已退出管理员', icon: 'none' });
  },

  goUpload: function () {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '请先验证管理员身份', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/upload/index' });
  },

  goFileList: function () {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '请先验证管理员身份', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/files/index' });
  },

  goDownload: function () {
    wx.navigateTo({ url: '/pages/download/index' });
  }
});