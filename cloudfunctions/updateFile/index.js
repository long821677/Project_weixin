const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const { id, maxDownloads, expireDays } = event;
    
    console.log('收到修改请求:', { id, maxDownloads, expireDays });
    
    if (!id || !maxDownloads || !expireDays) {
      return { success: false, code: 400, message: '参数不完整：需要 id、maxDownloads、expireDays' };
    }

    if (maxDownloads < 1 || maxDownloads > 1000) {
      return { success: false, code: 400, message: '下载次数必须在 1-1000 之间' };
    }

    if (expireDays < 1 || expireDays > 365) {
      return { success: false, code: 400, message: '有效期必须在 1-365 天之间' };
    }

    const expireAt = Date.now() + expireDays * 24 * 60 * 60 * 1000;

    let dbResult;
    try {
      dbResult = await cloud.database().collection('file_tokens').doc(id).update({
        data: {
          maxDownloads,
          expireDays,
          expireAt,
          updatedAt: cloud.database().serverDate()
        }
      });
      
      console.log('数据库更新成功:', dbResult);
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return { success: false, code: 500, message: '数据库操作失败：' + dbError.message };
    }

    return {
      success: true,
      data: {
        maxDownloads,
        expireDays,
        updated: dbResult.stats.updated
      },
      message: '修改成功'
    };
  } catch (error) {
    console.error('服务器错误:', error);
    return { success: false, code: 500, message: '服务器错误：' + error.message };
  }
};