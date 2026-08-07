const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { restaurantId, wantToGo } = event

  if (!restaurantId || typeof wantToGo !== 'boolean') {
    return { success: false, error: '参数缺失' }
  }

  try {
    const restaurantRes = await db.collection('restaurants').doc(restaurantId).get()
    const restaurant = restaurantRes.data
    if (!restaurant) {
      return { success: false, error: '餐厅不存在' }
    }

    const coupleRes = await db.collection('couples').doc(restaurant.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限操作' }
    }

    await db.collection('restaurants').doc(restaurantId).update({
      data: { wantToGo }
    })

    return { success: true }
  } catch (err) {
    console.error('toggleRestaurantWant 失败:', err)
    return { success: false, error: err.message }
  }
}
