const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const { ids } = event;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, code: 400, message: '缺少参数：ids 必须是数组' };
    }

    const db = cloud.database();
    
    const result = await db.collection('file_tokens').where({
      _id: db.command.in(ids)
    }).get();

    const fileRecords = result.data || [];
    const fileIDs = fileRecords
      .filter(record => record.fileID && record.fileID.startsWith('cloud://'))
      .map(record => record.fileID);

    if (fileIDs.length > 0) {
      try {
        await cloud.deleteFile({
          fileList: fileIDs
        });
      } catch (deleteError) {
        console.warn('删除云存储文件失败:', deleteError);
      }
    }

    await db.collection('file_tokens').where({
      _id: db.command.in(ids)
    }).remove();

    return {
      success: true,
      data: {
        deletedCount: ids.length
      },
      message: `成功删除 ${ids.length} 个文件`
    };
  } catch (error) {
    console.error('批量删除文件失败:', error);
    return { success: false, code: 500, message: '服务器错误：' + error.message };
  }
};