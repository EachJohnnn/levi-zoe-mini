const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 查找当前用户所属且未删除的情侣空间
    const coupleRes = await db.collection('couples')
      .where({
        members: OPENID,
        status: _.neq('deleted')
      })
      .limit(1)
      .get()

    if (coupleRes.data.length === 0) {
      return { success: false, msg: '未找到已加入的情侣空间' }
    }

    const couple = coupleRes.data[0]
    return {
      success: true,
      coupleId: couple._id,
      inviteCode: couple.inviteCode,
      name: couple.name
    }
  } catch (err) {
    console.error('findMyCouple 失败:', err)
    return { success: false, msg: '查询失败，请重试' }
  }
}
