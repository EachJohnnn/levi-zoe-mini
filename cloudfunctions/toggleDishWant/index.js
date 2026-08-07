const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { dishId, inWantPool, nickName, avatarUrl } = event

  if (!dishId || typeof inWantPool !== 'boolean') {
    return { success: false, error: '参数缺失' }
  }

  try {
    const dishRes = await db.collection('dishes').doc(dishId).get()
    const dish = dishRes.data
    if (!dish) {
      return { success: false, error: '菜品不存在' }
    }

    const coupleRes = await db.collection('couples').doc(dish.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限' }
    }

    if (inWantPool) {
      await db.collection('dishes').doc(dishId).update({
        data: {
          inWantPool: true,
          wantPoolTime: db.serverDate(),
          wantByOpenid: OPENID,
          wantByNickName: nickName || '',
          wantByAvatarUrl: avatarUrl || ''
        }
      })
    } else {
      await db.collection('dishes').doc(dishId).update({
        data: {
          inWantPool: false,
          wantPoolTime: null,
          wantByOpenid: '',
          wantByNickName: '',
          wantByAvatarUrl: ''
        }
      })
    }

    return { success: true }
  } catch (err) {
    console.error('toggleDishWant 失败:', err)
    return { success: false, error: err.message }
  }
}
