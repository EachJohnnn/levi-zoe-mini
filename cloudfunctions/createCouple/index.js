// cloudfunctions/createCouple/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const db = cloud.database()
  const couples = db.collection('couples')

  // 生成 6 位数字邀请码
  let inviteCode = ''
  for (let i = 0; i < 6; i++) {
    inviteCode += Math.floor(Math.random() * 10)
  }

  // 创建情侣空间记录
  const res = await couples.add({
    data: {
      inviteCode: inviteCode,
      name: '我们的小厨房',
      creatorOpenid: openid,
      members: [openid],
      createTime: new Date(),
      status: 'active'
    }
  })

  return {
    coupleId: res._id,   // 情侣空间的唯一 ID
    inviteCode: inviteCode
  }
}