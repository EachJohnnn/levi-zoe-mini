const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const {
    restaurantId,
    name,
    address,
    phone,
    pricePerPerson,
    cuisineTags,
    rating,
    note,
    wantToGo,
    latitude,
    longitude
  } = event

  if (!restaurantId) {
    return { success: false, error: '缺少 restaurantId' }
  }

  try {
    // 1. 读取餐厅并校验归属
    const restaurantRes = await db.collection('restaurants').doc(restaurantId).get()
    const restaurant = restaurantRes.data
    if (!restaurant) {
      return { success: false, error: '餐厅不存在' }
    }

    const coupleRes = await db.collection('couples').doc(restaurant.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限更新该餐厅' }
    }

    // 2. 安全更新
    const updateData = {
      name,
      address,
      phone: phone || '',
      pricePerPerson: pricePerPerson || null,
      cuisineTags: cuisineTags || [],
      rating: rating || 0,
      note: note || '',
      wantToGo: !!wantToGo,
      updateTime: db.serverDate()
    }

    if (latitude != null && longitude != null) {
      updateData.latitude = latitude
      updateData.longitude = longitude
    }

    const res = await db.collection('restaurants').doc(restaurantId).update({ data: updateData })

    return { success: true, stats: res.stats }
  } catch (err) {
    console.error('updateRestaurant 失败:', err)
    return { success: false, error: err.message }
  }
}
