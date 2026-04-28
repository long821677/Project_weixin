Page({
  data: {
    fileList: [],
    isLoading: true,
    errorMessage: '',
    selectedIds: [],
    selectedCount: 0,
    isAdmin: false
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
    this.loadFileList();
  },

  onShow: function () {
    this.loadFileList();
  },

  loadFileList: function () {
    this.setData({ isLoading: true, fileList: [], errorMessage: '', selectedIds: [], selectedCount: 0 });
    
    const that = this;
    let timeout = false;
    
    const timeoutTimer = setTimeout(() => {
      timeout = true;
      that.setData({ 
        isLoading: false, 
        errorMessage: '网络连接超时，请检查网络后重试' 
      });
    }, 10000);

    wx.cloud.callFunction({
      name: 'getFileList',
      success: (res) => {
        if (timeout) return;
        clearTimeout(timeoutTimer);
        
        if (res.result && res.result.success) {
          const fileList = res.result.data.list || [];
          const processedList = fileList.map(item => ({
            ...item,
            _id: String(item._id || ''),
            selected: false
          }));
          that.setData({
            fileList: processedList,
            isLoading: false,
            errorMessage: ''
          });
        } else {
          that.setData({ isLoading: false, errorMessage: '获取文件列表失败' });
        }
      },
      fail: (error) => {
        if (timeout) return;
        clearTimeout(timeoutTimer);
        that.setData({ 
          isLoading: false, 
          errorMessage: '获取失败，请检查网络' 
        });
      }
    });
  },

  toggleSelect: function (e) {
    const id = String(e.currentTarget?.dataset?.id || '');
    if (!id) return;
    
    const fileList = [...this.data.fileList];
    const item = fileList.find(f => String(f._id || '') === id);
    if (item) {
      item.selected = !item.selected;
    }
    
    const selectedCount = fileList.filter(item => item.selected).length;
    this.setData({ fileList, selectedCount });
  },

  toggleSelectAll: function () {
    const { fileList } = this.data;
    
    if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
      wx.showToast({ title: '暂无文件可选择', icon: 'none' });
      return;
    }
    
    const hasUnselected = fileList.some(item => !item.selected);
    const newFileList = fileList.map(item => ({
      ...item,
      selected: hasUnselected
    }));
    
    const selectedCount = hasUnselected ? fileList.length : 0;
    this.setData({ fileList: newFileList, selectedCount });
  },

  deleteSelected: function () {
    const { fileList } = this.data;
    
    const selectedFiles = fileList.filter(item => item.selected);
    if (selectedFiles.length === 0) {
      wx.showToast({ title: '请先选择要删除的文件', icon: 'none' });
      return;
    }
    
    const fileNames = selectedFiles.map(item => item.fileName).join('\n');
    const selectedIds = selectedFiles.map(item => String(item._id || ''));
    
    wx.showModal({
      title: '批量删除确认',
      content: `确定要删除以下 ${selectedIds.length} 个文件吗？\n\n${fileNames}`,
      confirmColor: '#e53935',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          wx.cloud.callFunction({
            name: 'deleteFiles',
            data: { ids: selectedIds },
            success: (res) => {
              wx.hideLoading();
              if (res.result && res.result.success) {
                wx.showToast({ title: `已删除 ${res.result.data.deletedCount} 个文件`, icon: 'success' });
                this.loadFileList();
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  copyLink: function (e) {
    const token = e.currentTarget.dataset.token;
    const fileName = e.currentTarget.dataset.filename || '文件';
    
    const shareText = `📁 ${fileName}\n🔑 分享码：${token}\n\n💡 使用方法：\n1. 微信搜索「文件分享系统」\n2. 点击「通过链接下载」\n3. 粘贴分享码即可下载`;
    
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showModal({
          title: '分享成功',
          content: '已复制分享信息到剪贴板',
          showCancel: false
        });
      },
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
    });
  },

  viewFile: function (e) {
    const token = e.currentTarget.dataset.token;
    wx.navigateTo({ url: `/pages/download/index?token=${token}` });
  },

  editFile: function (e) {
    const id = e.currentTarget.dataset.id;
    const fileName = e.currentTarget.dataset.filename;
    const maxDownloads = parseInt(e.currentTarget.dataset.maxdownloads) || 10;
    const expireDays = parseInt(e.currentTarget.dataset.expiredays) || 7;
    
    wx.showModal({
      title: '修改分享设置',
      content: `文件：${fileName}\n当前设置：${maxDownloads}次下载 / ${expireDays}天有效期`,
      editable: true,
      placeholderText: '输入新设置，格式：次数,天数（如：20,14）',
      confirmText: '保存',
      success: (res) => {
        if (res.confirm && res.content) {
          const parts = res.content.split(',');
          if (parts.length !== 2) {
            wx.showToast({ title: '格式错误', icon: 'none' });
            return;
          }
          
          const newMaxDownloads = parseInt(parts[0].trim());
          const newExpireDays = parseInt(parts[1].trim());
          
          if (isNaN(newMaxDownloads) || isNaN(newExpireDays)) {
            wx.showToast({ title: '请输入数字', icon: 'none' });
            return;
          }
          
          if (newMaxDownloads < 1 || newMaxDownloads > 1000) {
            wx.showToast({ title: '下载次数需在1-1000之间', icon: 'none' });
            return;
          }
          
          if (newExpireDays < 1 || newExpireDays > 365) {
            wx.showToast({ title: '有效期需在1-365天之间', icon: 'none' });
            return;
          }
          
          this.updateFileSettings(id, newMaxDownloads, newExpireDays);
        }
      }
    });
  },

  updateFileSettings: function (id, maxDownloads, expireDays) {
    wx.showLoading({ title: '修改中...' });
    
    wx.cloud.callFunction({
      name: 'updateFile',
      data: { id, maxDownloads, expireDays },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ title: '修改成功', icon: 'success' });
          this.loadFileList();
        } else {
          wx.showToast({ title: res.result?.message || '修改失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  deleteFile: function (e) {
    const id = e.currentTarget.dataset.id;
    const fileName = e.currentTarget.dataset.filename;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除文件「${fileName}」吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteFile',
            data: { id },
            success: (res) => {
              if (res.result && res.result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                this.loadFileList();
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' });
              }
            },
            fail: () => wx.showToast({ title: '删除失败', icon: 'none' })
          });
        }
      }
    });
  },

  formatDate: function (timestamp) {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  getFileExtension: function(fileName) {
    if (!fileName) return 'FILE';
    const ext = fileName.split('.').pop().toUpperCase();
    return ext.length > 4 ? 'FILE' : ext;
  },

  goUpload: function () {
    wx.navigateTo({ url: '/pages/upload/index' });
  },

  goDownloadByLink: function () {
    wx.navigateTo({ url: '/pages/download/index' });
  }
});