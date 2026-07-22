// cloudfunctions/joinCouple/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { inviteCode } = event

  if (!inviteCode) {
    return { success: false, msg: '邀请码不能为空' }
  }

  const db = cloud.database()
  const couples = db.collection('couples')

  // 查找匹配的邀请码
  const coupleRes = await couples.where({
    inviteCode: inviteCode,
    status: 'active'
  }).get()

  if (coupleRes.data.length === 0) {
    return { success: false, msg: '邀请码不存在或已失效' }
  }

  const couple = coupleRes.data[0]

  // 检查是否已经加入
  if (couple.members && couple.members.includes(openid)) {
    return { success: false, msg: '你已经加入该空间' }
  }

  // 把当前用户加入 members 数组
  await couples.doc(couple._id).update({
    data: {
      members: db.command.push(openid)
    }
  })

  return {
    success: true,
    coupleId: couple._id,
    inviteCode: inviteCode
  }
}