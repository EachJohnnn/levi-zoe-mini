const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { coupleId } = event || {}

  if (!coupleId) {
    return { success: false, error: '缺少 coupleId' }
  }

  try {
    const coupleRes = await db.collection('couples').doc(coupleId).get()
    const couple = coupleRes.data
    if (!couple) {
      return { success: false, error: '情侣空间不存在' }
    }

    const members = couple.members || []
    if (!members.includes(OPENID)) {
      return { success: false, error: '无权限查看该情侣空间成员' }
    }

    const userRes = await db.collection('users')
      .where({ openid: _.in(members) })
      .get()

    const userMap = {}
    userRes.data.forEach(u => {
      userMap[u.openid] = u
    })

    const resultMembers = members.map(openid => {
      const u = userMap[openid]
      return {
        openid,
        nickName: u?.nickName || openid?.slice(0, 8) || '未知',
        avatarUrl: u?.avatarUrl || ''
      }
    })

    return { success: true, members: resultMembers }
  } catch (err) {
    console.error('getCoupleMembers 失败:', err)
    return { success: false, error: err.message || '查询失败' }
  }
}
