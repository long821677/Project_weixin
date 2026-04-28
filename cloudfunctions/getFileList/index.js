const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  try {
    cloud.init({
      env: 'cloud1-8gpfi24n17c695d5',
      traceUser: true
    });

    const { pageSize = 20, pageNum = 1 } = event;
    
    const db = cloud.database();
    const skip = (pageNum - 1) * pageSize;
    
    const result = await db.collection('file_tokens')
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    const totalResult = await db.collection('file_tokens').count();
    const total = totalResult.total;
    const hasMore = skip + pageSize < total;

    return {
      success: true,
      data: {
        list: result.data,
        hasMore: hasMore,
        total: total
      }
    };
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return { success: false, code: 500, message: '服务器错误：' + error.message };
  }
};