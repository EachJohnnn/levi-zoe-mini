const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { inviteCode } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!inviteCode || inviteCode.length !== 6) {
    return { success: false, msg: '邀请码无效' }
  }

  try {
    // 查找邀请码对应的情侣空间
    const coupleRes = await db.collection('couples').where({
      inviteCode: inviteCode
    }).get()

    if (coupleRes.data.length === 0) {
      return { success: false, msg: '邀请码不存在' }
    }

    const couple = coupleRes.data[0]
    const coupleId = couple._id

    // 检查是否已经是成员
    const members = couple.members || []
    const alreadyJoined = members.includes(openid)

    if (!alreadyJoined) {
      // 还没加入，添加成员
      await db.collection('couples').doc(coupleId).update({
        data: {
          members: db.command.push(openid)
        }
      })
    }

    // 更新用户表的 coupleId（无论是否已加入都更新）
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length > 0) {
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: { coupleId }
      })
    }

    return {
      success: true,
      coupleId,
      alreadyJoined,
      msg: alreadyJoined ? '你已在该情侣空间中' : '加入成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, msg: '加入失败，请重试' }
  }
}