const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const {
    restaurantId,
    restaurantName,
    visitDate,
    totalPrice,
    rating,
    dishes,
    note
  } = event

  if (!restaurantId || !visitDate) {
    return { success: false, error: '参数缺失' }
  }

  try {
    // 校验餐厅归属
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

    // 添加打卡记录
    await db.collection('restaurantVisits').add({
      data: {
        restaurantId,
        restaurantName: restaurantName || restaurant.name,
        visitDate,
        totalPrice: totalPrice || null,
        rating: rating || 0,
        dishes: dishes || [],
        note: note || '',
        coupleId: restaurant.coupleId,
        creatorOpenid: OPENID,
        createTime: db.serverDate()
      }
    })

    // 更新餐厅打卡状态
    await db.collection('restaurants').doc(restaurantId).update({
      data: {
        visited: true,
        visitCount: _.inc(1)
      }
    })

    return { success: true }
  } catch (err) {
    console.error('recordRestaurantVisit 失败:', err)
    return { success: false, error: err.message }
  }
}
