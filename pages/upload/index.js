Page({
  data: {
    fileName: '',
    fileSize: 0,
    tempFilePath: '',
    isUploading: false,
    showShareLink: false,
    shareUrl: '',
    remainingDownloads: 10,
    expireDays: 7,
    uploadRetryCount: 0,
    isAdmin: false,
    lastError: null,
    fileExtension: '',
    formattedFileSize: ''
  },

  onLoad: function () {
    this.checkAdminPermission();
  },

  checkAdminPermission: function () {
    const isAdmin = wx.getStorageSync('isAdmin') || false;
    if (!isAdmin) {
      wx.showModal({
        title: '访问受限',
        content: '您没有权限访问此页面，请先验证管理员身份',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/index/index' });
        }
      });
      return;
    }
    this.setData({ isAdmin: true });
    this.checkFileApiSupport();
  },

  checkFileApiSupport: function () {
    if (wx.chooseMessageFile) {
      console.log('当前微信版本支持 chooseMessageFile API（聊天记录选择）');
    } else {
      console.log('当前微信版本不支持 chooseMessageFile API');
    }
  },

  onRemainingDownloadsChange: function (e) {
    const value = e.detail.value;
    if (value === '') {
      this.setData({ remainingDownloads: '' });
    } else {
      const num = parseInt(value) || 10;
      this.setData({ remainingDownloads: Math.max(1, Math.min(1000, num)) });
    }
  },

  onExpireDaysChange: function (e) {
    const value = e.detail.value;
    if (value === '') {
      this.setData({ expireDays: '' });
    } else {
      const num = parseInt(value) || 7;
      this.setData({ expireDays: Math.max(1, Math.min(365, num)) });
    }
  },

  chooseFile: function() {
    this.setData({ lastError: null });

    wx.showModal({
      title: '选择文件',
      content: '由于微信小程序平台限制，需要先将文件发送到微信聊天中，然后从聊天记录中选择。\n\n建议：\n1. 将文件发送到「文件传输助手」或任意聊天\n2. 返回小程序后选择「从聊天记录选择」',
      confirmText: '知道了',
      showCancel: false,
      success: () => {
        this.chooseFileFromMessage();
      }
    });
  },

  chooseFileFromMessage: function() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['ppt', 'pptx', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mov', 'txt', 'wav', 'mp3'],
      success: (res) => {
        console.log('从聊天记录选择文件成功:', res);
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          this.validateAndSetFile(file);
        } else {
          wx.showToast({ title: '未选择任何文件', icon: 'none' });
        }
      },
      fail: (error) => {
        console.error('从聊天记录选择文件失败:', error);
        this.handleFileChooseError(error);
      }
    });
  },

  handleFileChooseError: function(error) {
    console.error('文件选择失败:', error);

    const errMsg = error.errMsg || '';

    if (errMsg.includes('cancel')) {
      return;
    }

    wx.showModal({
      title: '选择文件失败',
      content: '无法从聊天记录中选择文件。\n\n常见原因：\n• 微信版本过低，请更新到最新版本\n• 未找到可选择的文件\n• 请先将文件发送到微信聊天中',
      showCancel: false
    });
  },

  validateAndSetFile: function(file) {
    console.log('===== 文件验证开始 =====');
    console.log('文件名:', file.name);
    console.log('文件大小:', file.size);
    console.log('文件路径:', file.path);

    if (!file.name) {
      wx.showToast({ title: '文件名无效，请重新选择', icon: 'none' });
      return;
    }

    const fileExtension = this.getFileExtension(file.name).toUpperCase();
    const pptExtensions = ['PPT', 'PPTX', 'POT', 'POTX', 'PPS', 'PPSX', 'ODP'];

    if (pptExtensions.includes(fileExtension)) {
      wx.showModal({
        title: 'PPT格式提示',
        content: `检测到您选择了 PPT 格式文件（${fileExtension}）。\n\n提示：建议将 PPT 文件另存为 PDF 格式后上传，兼容性更好，下载后可直接预览。\n\n是否继续上传此 PPT 文件？`,
        confirmText: '继续上传',
        cancelText: '另选其他文件',
        success: (res) => {
          if (res.confirm) {
            this.setFileInfo(file);
          }
        }
      });
      return;
    }

    if (file.size === 0) {
      wx.showToast({ title: '文件内容为空，请选择其他文件', icon: 'none' });
      return;
    }

    const supportedTypes = ['DOC', 'DOCX', 'PDF', 'XLS', 'XLSX', 'ZIP', 'RAR', 'JPG', 'JPEG', 'PNG', 'GIF', 'MP4', 'AVI', 'MOV', 'TXT', 'WAV', 'MP3'];

    if (!supportedTypes.includes(fileExtension)) {
      wx.showModal({
        title: '文件格式提示',
        content: `当前选择的是 ${fileExtension} 格式文件。\n\n支持的文件类型：\n• 文档：PDF、Word、Excel、TXT\n• 图片：JPG、PNG、GIF\n• 视频：MP4、AVI、MOV\n• 压缩包：ZIP、RAR\n• 音频：WAV、MP3\n\n是否继续上传？`,
        confirmText: '继续上传',
        cancelText: '重新选择',
        success: (res) => {
          if (res.confirm) {
            this.setFileInfo(file);
          }
        }
      });
    } else {
      this.setFileInfo(file);
    }
  },

  setFileInfo: function(file) {
    const that = this;
    const ext = this.getFileExtension(file.name);
    const formattedSize = this.formatFileSize(file.size);
    
    if (file.path.startsWith('http')) {
      console.log('文件路径是HTTP URL');
      this.setData({
        fileName: file.name,
        fileSize: file.size,
        tempFilePath: file.path,
        showShareLink: false,
        shareUrl: '',
        lastError: null,
        fileExtension: ext,
        formattedFileSize: formattedSize
      });
      wx.showToast({ title: '文件选择成功', icon: 'success' });
      return;
    }
    
    const fs = wx.getFileSystemManager();
    fs.stat({
      path: file.path,
      success: (statRes) => {
        if (statRes.size === 0) {
          wx.showToast({ title: '文件内容为空，请选择其他文件', icon: 'none' });
          return;
        }
        
        that.setData({
          fileName: file.name,
          fileSize: statRes.size,
          tempFilePath: file.path,
          showShareLink: false,
          shareUrl: '',
          lastError: null,
          fileExtension: ext,
          formattedFileSize: that.formatFileSize(statRes.size)
        });
        wx.showToast({ title: '文件选择成功', icon: 'success' });
      },
      fail: (statError) => {
        console.warn('文件系统验证失败，使用原始信息:', statError);
        that.setData({
          fileName: file.name,
          fileSize: file.size,
          tempFilePath: file.path,
          showShareLink: false,
          shareUrl: '',
          lastError: null,
          fileExtension: ext,
          formattedFileSize: formattedSize
        });
        wx.showToast({ title: '文件选择成功', icon: 'success' });
      }
    });
  },

  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileExtension: function(fileName) {
    if (!fileName) return 'FILE';
    const ext = fileName.split('.').pop().toUpperCase();
    return ext.length > 4 ? 'FILE' : ext;
  },

  uploadFile: function() {
    if (!this.data.fileName) {
      wx.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    if (this.data.fileSize === 0 || !this.data.tempFilePath) {
      wx.showToast({ title: '文件内容为空，请选择其他文件', icon: 'none' });
      return;
    }

    if (this.data.fileName.length > 100) {
      wx.showToast({ title: '文件名过长，请重命名后上传（最多100个字符）', icon: 'none' });
      return;
    }

    const specialChars = /[\\/:*?"<>|]/;
    if (specialChars.test(this.data.fileName)) {
      wx.showToast({ title: '文件名包含特殊字符，请重命名后上传', icon: 'none' });
      return;
    }

    if (this.data.isUploading) {
      return;
    }

    this.setData({ isUploading: true, showShareLink: false });
    wx.showLoading({ title: '上传中...' });

    const that = this;
    const token = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    
    let safeFileName = this.data.fileName;
    safeFileName = safeFileName.replace(/[\\/:*?"<>|]/g, '_');
    safeFileName = safeFileName.replace(/\s+/g, '_');
    const cloudPath = `files/${Date.now()}_${safeFileName}`;

    if (this.data.tempFilePath.startsWith('http')) {
      this.downloadAndUpload(this.data.tempFilePath, cloudPath, token);
      return;
    }
    
    this.uploadToCloud(this.data.tempFilePath, cloudPath, token);
  },

  downloadAndUpload: function(url, cloudPath, token) {
    const that = this;
    
    wx.downloadFile({
      url: url,
      timeout: 60000,
      success: (downloadRes) => {
        console.log('HTTP文件下载成功:', downloadRes);
        
        if (downloadRes.statusCode !== 200) {
          that.handleUploadError('文件下载失败，状态码: ' + downloadRes.statusCode);
          return;
        }
        
        if (!downloadRes.tempFilePath) {
          that.handleUploadError('下载文件路径为空');
          return;
        }
        
        that.uploadToCloud(downloadRes.tempFilePath, cloudPath, token);
      },
      fail: (downloadError) => {
        console.error('HTTP文件下载失败:', downloadError);
        that.handleUploadError('文件下载失败，请检查网络或尝试选择其他文件');
      }
    });
  },

  uploadToCloud: function(localFilePath, cloudPath, token) {
    const that = this;
    
    const fs = wx.getFileSystemManager();
    try {
      const stat = fs.statSync(localFilePath);
      if (stat.size === 0) {
        that.handleUploadError('文件内容为空，请重新选择文件');
        return;
      }
    } catch (statError) {
      that.handleUploadError('无法读取文件内容');
      return;
    }
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: localFilePath,
      success: (uploadResult) => {
        console.log('上传到云存储成功:', uploadResult);
        
        if (!uploadResult || !uploadResult.fileID) {
          that.handleUploadError('上传失败，请重试');
          return;
        }
        
        that.saveFileRecord(uploadResult.fileID, token);
      },
      fail: (error) => {
        console.error('文件上传失败:', error);
        that.handleUploadError(this.getUploadErrorMessage(error));
      }
    });
  },

  getUploadErrorMessage: function(error) {
    const errMsg = error.errMsg || '';
    
    if (errMsg.includes('timeout')) {
      return '上传超时，请检查网络后重试';
    } else if (errMsg.includes('permission')) {
      return '云存储权限不足，请联系管理员检查配置';
    } else if (errMsg.includes('invalid signature')) {
      return '签名无效，请重新上传';
    } else if (errMsg.includes('file size')) {
      return '文件大小超出限制，请选择较小的文件';
    } else if (errMsg) {
      return '上传失败: ' + errMsg;
    }
    return '文件上传失败，请稍后重试';
  },

  handleUploadError: function(message) {
    wx.hideLoading();
    console.error('上传错误:', message);

    this.setData({
      isUploading: false,
      lastError: message
    });

    wx.showModal({
      title: '上传失败',
      content: message + '\n\n您可以：\n• 点击"重新选择"选择其他文件\n• 点击"取消"保留当前文件后重试',
      confirmText: '重新选择',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.chooseFile();
        }
      }
    });
  },

  saveFileRecord: function(fileID, token) {
    const that = this;
    const maxDownloads = this.data.remainingDownloads ? parseInt(this.data.remainingDownloads) : 10;
    const expireDays = this.data.expireDays ? parseInt(this.data.expireDays) : 7;
    
    wx.cloud.callFunction({
      name: 'uploadFile',
      data: {
        fileID: fileID,
        fileName: that.data.fileName,
        token: token,
        maxDownloads: maxDownloads,
        expireDays: expireDays,
        cloudPath: fileID
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.success) {
          const shareUrl = `/pages/download/index?token=${token}`;
          that.setData({
            isUploading: false,
            showShareLink: true,
            shareUrl: shareUrl,
            lastError: null
          });
          wx.showToast({ title: '上传成功', icon: 'success' });
        } else {
          that.handleUploadError(res.result.message || '保存失败');
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('保存记录失败:', error);
        that.handleUploadError('保存失败，请检查云函数配置');
      }
    });
  },

  copyLink: function() {
    if (!this.data.shareUrl) return;
    
    wx.setClipboardData({
      data: this.data.shareUrl,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' });
      }
    });
  },

  goHome: function() {
    wx.reLaunch({ url: '/pages/files/index' });
  },

  resetUpload: function() {
    this.setData({
      fileName: '',
      fileSize: 0,
      tempFilePath: '',
      showShareLink: false,
      shareUrl: '',
      lastError: null,
      uploadRetryCount: 0,
      fileExtension: '',
      formattedFileSize: ''
    });
  },

  retryUpload: function() {
    if (this.data.fileName && !this.data.isUploading) {
      this.uploadFile();
    }
  }
});