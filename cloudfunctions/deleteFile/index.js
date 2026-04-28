const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const { id } = event;
    
    if (!id) {
      return { success: false, code: 400, message: '缺少参数：id' };
    }

    const db = cloud.database();
    
    const result = await db.collection('file_tokens').doc(id).get();
    if (!result.data) {
      return { success: false, code: 404, message: '文件不存在' };
    }

    const fileRecord = result.data;

    if (fileRecord.fileID) {
      try {
        await cloud.deleteFile({
          fileList: [fileRecord.fileID]
        });
      } catch (deleteError) {
        console.warn('删除云存储文件失败:', deleteError);
      }
    }

    await db.collection('file_tokens').doc(id).remove();

    return {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除文件失败:', error);
    return { success: false, code: 500, message: '服务器错误：' + error.message };
  }
};