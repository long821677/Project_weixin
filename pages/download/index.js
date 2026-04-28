Page({
  data: {
    token: '',
    inputToken: '',
    fileName: '',
    currentDownloads: 0,
    maxDownloads: 10,
    isLoading: false,
    errorMessage: '',
    downloadUrl: '',
    showFileInfo: false,
    requestCount: 0,
    maxRequests: 5
  },

  onLoad: function (options) {
    const token = options?.token || '';
    if (token && this.validateTokenFormat(token)) {
      this.setData({ token });
      this.loadFileInfo(token);
    }
  },

  validateTokenFormat: function (token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    const tokenPattern = /^[a-zA-Z0-9_-]{10,50}$/;
    return tokenPattern.test(token);
  },

  loadFileInfo: function (token) {
    this.setData({ isLoading: true, showFileInfo: false, errorMessage: '' });
    
    const that = this;
    let timeout = false;
    const timeoutTimer = setTimeout(() => {
      timeout = true;
      that.setData({ isLoading: false, errorMessage: '网络连接超时，请检查网络' });
    }, 15000);

    wx.cloud.callFunction({
      name: 'downloadFile',
      data: { token },
      success: (res) => {
        if (timeout) return;
        clearTimeout(timeoutTimer);
        
        if (res.result && res.result.success) {
          that.setData({
            fileName: res.result.data.fileName,
            currentDownloads: res.result.data.currentDownloads,
            maxDownloads: res.result.data.maxDownloads,
            isLoading: false,
            downloadUrl: res.result.data.downloadUrl,
            showFileInfo: true
          });
        } else {
          that.setData({ 
            isLoading: false, 
            errorMessage: res.result?.message || '获取文件信息失败' 
          });
        }
      },
      fail: (error) => {
        if (timeout) return;
        clearTimeout(timeoutTimer);
        that.setData({ 
          isLoading: false, 
          errorMessage: '网络错误，请稍后重试：' + (error.errMsg || '') 
        });
      }
    });
  },

  onInputChange: function (e) {
    this.setData({ inputToken: e.detail.value });
  },

  submitToken: function () {
    const { inputToken, requestCount, maxRequests } = this.data;
    const token = inputToken.trim();
    
    if (!token) {
      wx.showToast({ title: '请输入分享码', icon: 'none' });
      return;
    }
    
    if (!this.validateTokenFormat(token)) {
      wx.showToast({ title: '无效的分享码格式', icon: 'none' });
      return;
    }
    
    if (requestCount >= maxRequests) {
      wx.showModal({
        title: '请求受限',
        content: '您的请求次数已达上限，请稍后再试',
        showCancel: false
      });
      return;
    }
    
    this.setData({ 
      token, 
      requestCount: requestCount + 1 
    });
    this.loadFileInfo(token);
  },

  previewFile: function () {
    const { downloadUrl, fileName, token } = this.data;
    if (!downloadUrl || !fileName) return;

    const that = this;
    const ext = fileName.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const isImage = imageTypes.includes(ext);
    
    console.log('===== 文件预览调试 =====');
    console.log('文件名:', fileName);
    console.log('文件扩展名:', ext);
    console.log('是否为图片:', isImage);
    console.log('downloadUrl:', downloadUrl);

    // 图片文件：使用 wx.previewImage 预览
    if (isImage) {
      wx.showLoading({ title: '加载中...' });
      
      wx.previewImage({
        urls: [downloadUrl],
        current: downloadUrl,
        success: () => {
          wx.hideLoading();
          console.log('图片预览成功');
          setTimeout(() => {
            wx.showToast({ 
              title: '点击右上角可保存图片', 
              icon: 'none',
              duration: 2000 
            });
          }, 500);
        },
        fail: (previewError) => {
          wx.hideLoading();
          console.error('图片预览失败:', previewError);
          wx.showModal({
            title: '预览失败',
            content: '无法在小程序中预览图片，请尝试下载',
            confirmText: '知道了',
            showCancel: false
          });
        }
      });
      return;
    }

    // 非图片文件：使用 wx.openDocument 预览
    wx.showLoading({ title: '加载中...' });

    wx.downloadFile({
      url: downloadUrl,
      timeout: 30000,
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode !== 200) {
          wx.showToast({ title: '获取文件失败', icon: 'none' });
          return;
        }

        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: () => {
            console.log('文件预览成功');
          },
          fail: (error) => {
            console.error('文件预览失败:', error);
            wx.showModal({
              title: '预览失败',
              content: '无法在小程序中预览此文件，请尝试下载',
              confirmText: '知道了',
              showCancel: false
            });
          }
        });
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('下载文件失败:', error);
        wx.showModal({
          title: '加载失败',
          content: '网络连接异常，是否重新获取链接？',
          success: (modalRes) => {
            if (modalRes.confirm && token) {
              that.refreshDownloadUrl(token, () => {
                that.previewFile();
              });
            }
          }
        });
      }
    });
  },

  downloadFile: function () {
    const { downloadUrl, fileName, token } = this.data;
    if (!downloadUrl || !fileName) return;

    const that = this;
    const ext = fileName.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const isImage = imageTypes.includes(ext);
    
    wx.showLoading({ title: '下载中...' });

    wx.downloadFile({
      url: downloadUrl,
      timeout: 30000,
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }

        const fileSize = res.dataLength || res.fileSize || 0;
        if (fileSize < 100) {
          wx.showToast({ title: '文件内容异常', icon: 'none' });
          return;
        }

        // 图片文件保存到相册
        if (isImage) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ 
                title: '图片已保存到相册', 
                icon: 'success',
                duration: 3000 
              });
            },
            fail: (saveError) => {
              console.error('保存到相册失败:', saveError);
              wx.showModal({
                title: '保存失败',
                content: '无法保存到相册，请检查相册权限设置',
                showCancel: false
              });
            }
          });
        } else {
          // 非图片文件提示用户用其他应用打开
          wx.showModal({
            title: '下载完成',
            content: '文件已下载，可使用其他应用打开查看',
            confirmText: '知道了',
            showCancel: false
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('下载文件失败:', error);
        wx.showModal({
          title: '下载失败',
          content: '网络连接异常，是否重新获取链接？',
          success: (modalRes) => {
            if (modalRes.confirm && token) {
              that.refreshDownloadUrl(token, () => {
                that.downloadFile();
              });
            }
          }
        });
      }
    });
  },

  refreshDownloadUrl: function (token, callback) {
    wx.showLoading({ title: '重新获取链接...' });
    
    wx.cloud.callFunction({
      name: 'downloadFile',
      data: { token },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.setData({ downloadUrl: res.result.data.downloadUrl });
          if (typeof callback === 'function') {
            callback();
          } else {
            this.previewFile();
          }
        } else {
          wx.showToast({ title: '获取链接失败', icon: 'none' });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  goBack: function () {
    wx.reLaunch({
      url: '/pages/files/index'
    });
  },

  reset: function () {
    this.setData({ 
      token: '', 
      inputToken: '', 
      showFileInfo: false, 
      errorMessage: '' 
    });
  },

  getFileExtension: function(fileName) {
    if (!fileName) return 'FILE';
    const ext = fileName.split('.').pop().toUpperCase();
    return ext.length > 4 ? 'FILE' : ext;
  },

  truncateFileName: function(fileName, maxLength = 30) {
    if (!fileName) return '';
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.length - ext.length - 1);
    const availableLength = maxLength - ext.length - 3;
    if (availableLength <= 0) {
      return '...' + ext;
    }
    return nameWithoutExt.substring(0, availableLength) + '...' + ext;
  }
});