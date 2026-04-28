const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const { fileID, fileName, token, maxDownloads = 10, expireDays = 7 } = event;
    
    console.log('收到上传请求:', { fileID, fileName, token, maxDownloads, expireDays });
    
    if (!fileID || !fileName || !token) {
      return { success: false, code: 400, message: '缺少参数：fileID、fileName 或 token' };
    }

    const expireAt = Date.now() + expireDays * 24 * 60 * 60 * 1000;

    let dbResult;
    try {
      dbResult = await cloud.database().collection('file_tokens').add({
        data: {
          token,
          fileName,
          fileID,
          maxDownloads,
          currentDownloads: 0,
          expireAt,
          createdAt: cloud.database().serverDate()
        }
      });
      
      console.log('数据库保存成功:', dbResult);
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return { success: false, code: 500, message: '数据库操作失败：' + dbError.message };
    }

    return {
      success: true,
      data: { 
        token, 
        fileName, 
        shareUrl: `/pages/download/index?token=${token}` 
      }
    };
  } catch (error) {
    console.error('服务器错误:', error);
    return { success: false, code: 500, message: '服务器错误：' + error.message };
  }
};