const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  const { token } = event;
  
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const db = cloud.database();
    
    console.log('收到下载请求，token:', token);
    
    if (!token || token === 'undefined') {
      return {
        success: false,
        message: '请输入有效的分享码'
      };
    }
    
    const result = await db.collection('file_tokens').where({ token }).get();
    
    console.log('查询结果:', JSON.stringify(result));
    
    if (!result || !result.data || result.data.length === 0) {
      return {
        success: false,
        message: '链接无效或已过期'
      };
    }
    
    const fileRecord = result.data[0];
    console.log('文件记录:', JSON.stringify(fileRecord));
    
    if (!fileRecord.fileID || !fileRecord.fileID.startsWith('cloud://')) {
      return {
        success: false,
        message: '文件信息不完整'
      };
    }
    
    const now = Date.now();
    
    if (fileRecord.expireAt && now > fileRecord.expireAt) {
      return {
        success: false,
        message: '链接已过期'
      };
    }
    
    if (fileRecord.currentDownloads >= fileRecord.maxDownloads) {
      return {
        success: false,
        message: '下载次数已用完'
      };
    }
    
    console.log('开始获取临时链接，fileID:', fileRecord.fileID);
    
    // 注意：getFileInfo 在某些环境下可能不稳定，暂时跳过
    // 文件大小检查将在前端完成
    console.log('跳过getFileInfo，将在前端检查文件内容');
    
    // 获取临时下载链接
    let tempUrlResult;
    try {
      tempUrlResult = await cloud.getTempFileURL({
        fileList: [fileRecord.fileID],
        timeout: 30000
      });
    } catch (urlError) {
      console.error('getTempFileURL调用异常:', urlError);
      return {
        success: false,
        message: '获取下载链接失败：' + urlError.message
      };
    }
    
    console.log('临时链接完整结果类型:', typeof tempUrlResult);
    console.log('临时链接完整结果:', JSON.stringify(tempUrlResult));
    
    if (!tempUrlResult) {
      console.error('临时链接结果为null或undefined');
      return {
        success: false,
        message: '获取下载链接失败：结果为空'
      };
    }
    
    const fileList = tempUrlResult.fileList || tempUrlResult.list;
    console.log('文件列表:', fileList);
    
    if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
      console.error('文件列表为空或不是数组');
      return {
        success: false,
        message: '获取下载链接失败：文件列表为空'
      };
    }
    
    const fileItem = fileList[0];
    console.log('文件项:', fileItem);
    
    if (!fileItem) {
      console.error('文件项为空');
      return {
        success: false,
        message: '获取下载链接失败：文件项为空'
      };
    }
    
    const hasError = fileItem.code !== undefined && fileItem.code !== 0;
    const hasUrl = fileItem.tempFileURL || fileItem.downloadUrl;
    
    console.log('hasError:', hasError, 'hasUrl:', hasUrl);
    
    if (hasError) {
      const errCode = fileItem.code;
      const errMsg = fileItem.errMsg || fileItem.message || '未知错误';
      console.error('获取链接失败，错误码:', errCode, '错误信息:', errMsg);
      return {
        success: false,
        message: `获取下载链接失败 [${errCode}]: ${errMsg}`
      };
    }
    
    if (!hasUrl) {
      console.error('临时链接为空，文件项完整内容:', JSON.stringify(fileItem));
      return {
        success: false,
        message: '获取下载链接失败：链接为空'
      };
    }
    
    const downloadUrl = fileItem.tempFileURL || fileItem.downloadUrl;
    console.log('临时链接获取成功:', downloadUrl);
    
    await db.collection('file_tokens').doc(fileRecord._id).update({
      data: {
        currentDownloads: fileRecord.currentDownloads + 1
      }
    });
    
    return {
      success: true,
      data: {
        fileName: fileRecord.fileName,
        downloadUrl: downloadUrl,
        currentDownloads: fileRecord.currentDownloads + 1,
        maxDownloads: fileRecord.maxDownloads
      }
    };
    
  } catch (error) {
    console.error('下载云函数异常:', error);
    return {
      success: false,
      message: '服务器错误：' + error.message
    };
  }
};