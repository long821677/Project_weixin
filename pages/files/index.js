Page({
  data: {
    fileList: [],
    isLoading: true,
    errorMessage: '',
    selectedIds: [],
    selectedCount: 0
  },

  onLoad: function () {
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
    const shareUrl = `/pages/download/index?token=${token}`;
    
    wx.setClipboardData({
      data: shareUrl,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
    });
  },

  viewFile: function (e) {
    const token = e.currentTarget.dataset.token;
    wx.navigateTo({ url: `/pages/download/index?token=${token}` });
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