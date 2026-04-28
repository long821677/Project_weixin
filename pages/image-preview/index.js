Page({
  data: {
    imageUrl: '',
    tempFilePath: '',
    loading: true,
    error: ''
  },

  onLoad: function (options) {
    const { url, tempPath } = options;
    console.log('图片预览页面加载:', url, tempPath);
    
    if (url) {
      this.setData({ 
        imageUrl: decodeURIComponent(url),
        tempFilePath: tempPath || ''
      });
      
      // 先下载图片到本地
      this.downloadAndShowImage();
    }
  },

  downloadAndShowImage: function () {
    const { imageUrl } = this.data;
    
    if (!imageUrl) {
      this.setData({ loading: false, error: '图片链接为空' });
      return;
    }
    
    console.log('直接使用下载链接显示图片:', imageUrl);
    
    // 直接使用下载链接显示，不下载到本地
    this.setData({ 
      tempFilePath: imageUrl,
      loading: false, 
      error: '' 
    });
  },

  onImageLoad: function (e) {
    console.log('图片加载成功:', e);
    this.setData({ loading: false, error: '' });
  },

  onImageError: function (e) {
    console.error('图片加载失败:', e);
    
    // 图片加载失败，尝试自动保存到相册
    const { tempFilePath } = this.data;
    
    wx.showModal({
      title: '预览失败',
      content: '无法在小程序中预览图片，是否保存到相册查看？',
      confirmText: '保存到相册',
      cancelText: '知道了',
      success: (modalRes) => {
        if (modalRes.confirm && tempFilePath) {
          wx.showLoading({ title: '保存中...' });
          wx.saveImageToPhotosAlbum({
            filePath: tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '保存成功，请在相册查看', icon: 'success' });
              this.setData({ loading: false, error: '' });
            },
            fail: (saveError) => {
              wx.hideLoading();
              console.error('保存到相册失败:', saveError);
              this.setData({ loading: false, error: '保存失败，请手动保存' });
            }
          });
        } else {
          this.setData({ loading: false, error: '图片加载失败' });
        }
      }
    });
  },

  retry: function () {
    this.setData({ loading: true, error: '' });
    this.downloadAndShowImage();
  },

  saveImage: function () {
    const { tempFilePath } = this.data;
    
    if (!tempFilePath) {
      wx.showToast({ title: '图片未加载', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('保存失败:', error);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  goBack: function () {
    wx.navigateBack();
  }
});