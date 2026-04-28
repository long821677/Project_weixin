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
    uploadRetryCount: 0
  },

  onLoad: function () {
    // 检查是否支持 chooseFile API（基础库 2.14.0+）
    this.checkFileApiSupport();
  },

  checkFileApiSupport: function () {
    if (wx.chooseFile) {
      console.log('当前微信版本支持 chooseFile API');
    } else {
      console.log('当前微信版本不支持 chooseFile API，将使用 chooseMessageFile');
    }
  },

  chooseFile: function() {
    // 优先使用 chooseFile（从文件系统选择），兼容旧版本使用 chooseMessageFile
    if (wx.chooseFile) {
      this.chooseFileFromSystem();
    } else {
      this.chooseFileFromMessage();
    }
  },

  // 从手机文件系统选择文件（推荐）
  chooseFileFromSystem: function() {
    wx.chooseFile({
      count: 1,
      type: 'all',
      success: (res) => {
        console.log('选择文件成功:', res);
        const file = res.tempFiles[0];
        
        // 验证文件内容
        this.validateFile(file);
      },
      fail: (error) => {
        console.error('选择文件失败:', error);
        // 如果 chooseFile 失败，尝试从聊天记录选择
        this.chooseFileFromMessage();
      }
    });
  },

  // 从聊天记录选择文件（兼容旧版本）
  chooseFileFromMessage: function() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        
        // 验证文件内容
        this.validateFile(file);
      },
      fail: (error) => {
        console.error('选择文件失败:', error);
        wx.showToast({ title: '选择文件失败，请确保微信版本>=7.0.13', icon: 'none' });
      }
    });
  },

  // 验证文件内容
  validateFile: function(file) {
    console.log('===== 文件验证开始 =====');
    console.log('文件名:', file.name);
    console.log('文件原始大小:', file.size);
    console.log('文件路径:', file.path);
    console.log('文件路径类型:', file.path.startsWith('http') ? 'HTTP URL' : '本地路径');
    
    const that = this;
    
    // 首先检查文件大小
    if (file.size === 0) {
      console.error('文件原始大小为0');
      wx.showToast({ title: '文件内容为空，请选择其他文件', icon: 'none' });
      return;
    }
    
    // 如果是HTTP URL，尝试直接使用文件信息
    if (file.path.startsWith('http')) {
      console.log('文件路径是HTTP URL，直接使用原始信息');
      that.setData({
        fileName: file.name,
        fileSize: file.size,
        tempFilePath: file.path,
        showShareLink: false,
        shareUrl: ''
      });
      wx.showToast({ title: '文件选择成功', icon: 'success' });
      return;
    }
    
    // 使用文件系统验证文件
    const fs = wx.getFileSystemManager();
    fs.stat({
      path: file.path,
      success: (statRes) => {
        console.log('文件系统验证成功:', statRes);
        console.log('文件系统大小:', statRes.size);
        
        // 再次检查文件大小
        if (statRes.size === 0) {
          console.error('文件系统验证发现文件大小为0');
          wx.showToast({ title: '文件内容为空，请选择其他文件', icon: 'none' });
          return;
        }
        
        that.setData({
          fileName: file.name,
          fileSize: statRes.size,
          tempFilePath: file.path,
          showShareLink: false,
          shareUrl: ''
        });
        
        wx.showToast({ title: '文件选择成功', icon: 'success' });
      },
      fail: (statError) => {
        console.error('文件系统验证失败:', statError);
        console.error('文件系统验证失败详情:', JSON.stringify(statError));
        
        // 如果文件系统验证失败，仍然尝试使用原始文件信息
        that.setData({
          fileName: file.name,
          fileSize: file.size,
          tempFilePath: file.path,
          showShareLink: false,
          shareUrl: ''
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
    if (!fileName) return '?';
    const ext = fileName.split('.').pop().toUpperCase();
    return ext.length > 4 ? 'FILE' : ext;
  },

  uploadFile: function(retryCount = 0) {
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

    // 检查文件名是否包含特殊字符
    const specialChars = /[\\/:*?"<>|]/;
    if (specialChars.test(this.data.fileName)) {
      wx.showToast({ title: '文件名包含特殊字符，请重命名后上传', icon: 'none' });
      return;
    }

    // 检查文件名是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(this.data.fileName);
    if (hasChinese) {
      console.log('文件名包含中文字符:', this.data.fileName);
    }

    if (this.data.isUploading) {
      return;
    }

    this.setData({ isUploading: true, showShareLink: false });
    wx.showLoading({ title: '上传中...' });

    const that = this;
    const token = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    
    // 处理文件名，避免特殊字符导致的问题
    let safeFileName = this.data.fileName;
    safeFileName = safeFileName.replace(/[\\/:*?"<>|]/g, '_');
    safeFileName = safeFileName.replace(/\s+/g, '_');
    const cloudPath = `files/${Date.now()}_${safeFileName}`;

    // 如果文件路径是 HTTP URL，先下载到本地再上传
    if (this.data.tempFilePath.startsWith('http')) {
      console.log('文件路径是HTTP URL，需要先下载到本地');
      
      wx.downloadFile({
        url: this.data.tempFilePath,
        timeout: 30000,
        success: (downloadRes) => {
          console.log('HTTP文件下载成功:', downloadRes);
          
          if (downloadRes.statusCode !== 200) {
            wx.hideLoading();
            wx.showToast({ title: '文件下载失败，状态码: ' + downloadRes.statusCode, icon: 'none' });
            that.setData({ isUploading: false });
            return;
          }
          
          if (!downloadRes.tempFilePath) {
            wx.hideLoading();
            wx.showToast({ title: '下载文件路径为空', icon: 'none' });
            that.setData({ isUploading: false });
            return;
          }
          
          // 使用下载后的本地路径上传
          that.uploadToCloud(downloadRes.tempFilePath, cloudPath, token);
        },
        fail: (downloadError) => {
          wx.hideLoading();
          console.error('HTTP文件下载失败:', downloadError);
          wx.showModal({
            title: '下载失败',
            content: '文件下载失败，请检查网络或尝试选择其他文件',
            showCancel: false
          });
          that.setData({ isUploading: false });
        }
      });
      
      return;
    }
    
    // 步骤1：在小程序端直接上传文件到云存储（本地路径）
    console.log('===== 开始上传文件 =====');
    console.log('文件路径:', this.data.tempFilePath);
    console.log('文件路径类型:', this.data.tempFilePath.startsWith('http') ? 'HTTP URL' : '本地路径');
    console.log('文件大小:', this.data.fileSize, 'bytes');
    console.log('文件名:', this.data.fileName);
    console.log('云存储路径:', cloudPath);
    
    // 直接使用本地路径上传
    that.uploadToCloud(this.data.tempFilePath, cloudPath, token);
  },

  // 上传到云存储的方法
  uploadToCloud: function(localFilePath, cloudPath, token) {
    const that = this;
    
    console.log('===== 开始上传到云存储 =====');
    console.log('本地文件路径:', localFilePath);
    console.log('云存储路径:', cloudPath);
    
    // 验证本地文件是否存在且有内容
    const fs = wx.getFileSystemManager();
    try {
      const stat = fs.statSync(localFilePath);
      console.log('本地文件状态:', JSON.stringify(stat));
      console.log('本地文件大小:', stat.size, 'bytes');
      console.log('本地文件路径:', localFilePath);
      console.log('本地文件路径类型:', localFilePath.startsWith('http') ? 'HTTP URL' : '本地路径');
      console.log('本地文件路径前缀:', localFilePath.substring(0, 20));
      
      if (stat.size === 0) {
        wx.hideLoading();
        console.error('本地文件大小为0');
        wx.showToast({ title: '文件内容为空，请重新选择文件', icon: 'none' });
        that.setData({ isUploading: false });
        return;
      }
      
      // 尝试读取文件内容的前几个字节
      try {
        const buffer = fs.readFileSync(localFilePath, { length: 10 });
        console.log('本地文件前10字节:', buffer);
        console.log('本地文件内容验证通过');
      } catch (readError) {
        console.warn('无法读取文件内容:', readError);
        // 继续上传，可能是二进制文件
      }
    } catch (statError) {
      wx.hideLoading();
      console.error('无法读取本地文件:', statError);
      console.error('本地文件路径:', localFilePath);
      wx.showToast({ title: '无法读取文件内容', icon: 'none' });
      that.setData({ isUploading: false });
      return;
    }
    
    console.log('===== 准备调用 wx.cloud.uploadFile =====');
    console.log('cloudPath:', cloudPath);
    console.log('filePath:', localFilePath);
    console.log('filePath长度:', localFilePath.length);
    console.log('filePath是否以wxfile://开头:', localFilePath.startsWith('wxfile://'));
    console.log('filePath是否以tmp://开头:', localFilePath.startsWith('tmp://'));
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: localFilePath,
      success: (uploadResult) => {
        console.log('===== 上传到云存储成功 =====');
        console.log('上传结果:', JSON.stringify(uploadResult));
        console.log('文件ID:', uploadResult.fileID);
        console.log('上传结果类型:', typeof uploadResult);
        
        if (!uploadResult || !uploadResult.fileID) {
          wx.hideLoading();
          console.error('上传结果异常:', uploadResult);
          wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          that.setData({ isUploading: false });
          return;
        }
        
        // 验证上传到云存储的文件是否有内容
        console.log('===== 验证云存储文件 =====');
        wx.cloud.getTempFileURL({
          fileList: [uploadResult.fileID],
          success: (urlResult) => {
            console.log('临时链接获取成功:', urlResult);
            
            // 尝试下载验证文件内容
            wx.downloadFile({
              url: urlResult.fileList[0].tempFileURL,
              success: (downloadRes) => {
                console.log('云存储文件下载验证:', downloadRes);
                console.log('下载响应 statusCode:', downloadRes.statusCode);
                console.log('下载响应 dataLength:', downloadRes.dataLength);
                console.log('下载响应 fileSize:', downloadRes.fileSize);
                
                // 检查文件大小，可能在 dataLength 或 fileSize 中
                const fileSize = downloadRes.dataLength || downloadRes.fileSize;
                console.log('实际文件大小:', fileSize, 'bytes');
                
                if (fileSize === 0 || fileSize === undefined) {
                  console.error('云存储文件内容为空！');
                  wx.showModal({
                    title: '警告',
                    content: '文件上传后内容为空，可能上传失败，请重新上传',
                    showCancel: false
                  });
                } else {
                  console.log('云存储文件验证通过，大小:', fileSize, 'bytes');
                  wx.showToast({ title: '文件验证通过', icon: 'success' });
                }
              },
              fail: (downloadError) => {
                console.error('云存储文件验证下载失败:', downloadError);
              }
            });
          },
          fail: (urlError) => {
            console.error('获取临时链接验证失败:', urlError);
          }
        });
        
        // 步骤2：调用云函数保存记录到数据库
        wx.cloud.callFunction({
          name: 'uploadFile',
          data: {
            fileID: uploadResult.fileID,
            fileName: that.data.fileName,
            token: token,
            maxDownloads: that.data.remainingDownloads,
            expireDays: that.data.expireDays,
            cloudPath: uploadResult.fileID
          },
          success: (res) => {
            wx.hideLoading();
            if (res.result.success) {
              const shareUrl = `/pages/download/index?token=${token}`;
              that.setData({
                isUploading: false,
                showShareLink: true,
                shareUrl: shareUrl
              });
              wx.showToast({ title: '上传成功', icon: 'success' });
            } else {
              wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
              that.setData({ isUploading: false });
            }
          },
          fail: (error) => {
            wx.hideLoading();
            console.error('保存记录失败:', error);
            wx.showToast({ title: '保存失败，请检查云函数', icon: 'none' });
            that.setData({ isUploading: false });
          }
        });
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('文件上传失败:', error);
        console.error('上传失败详情:', JSON.stringify(error));
        
        // 根据错误类型给出更具体的提示
        let errorMsg = '文件上传失败';
        if (error.errMsg && error.errMsg.includes('timeout')) {
          errorMsg = '上传超时，请检查网络';
        } else if (error.errMsg && error.errMsg.includes('permission')) {
          errorMsg = '云存储权限不足，请检查配置';
        } else if (error.errMsg && error.errMsg.includes('invalid signature')) {
          errorMsg = '签名无效，请重新上传';
        } else if (error.errMsg) {
          errorMsg = '上传失败: ' + error.errMsg;
        }
        
        wx.showModal({
          title: '上传失败',
          content: errorMsg + '\n\n建议：\n1. 检查网络连接\n2. 尝试选择其他文件\n3. 联系管理员检查云存储配置',
          showCancel: false
        });
        that.setData({ isUploading: false });
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
      shareUrl: ''
    });
  }
});