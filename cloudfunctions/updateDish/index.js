const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { dishId, name, category, ingredients, steps, tips, videoLinks } = event

  if (!dishId) {
    return { success: false, error: '缺少 dishId' }
  }

  try {
    // 1. 读取菜品并校验归属
    const dishRes = await db.collection('dishes').doc(dishId).get()
    const dish = dishRes.data
    if (!dish) {
      return { success: false, error: '菜品不存在' }
    }

    const coupleRes = await db.collection('couples').doc(dish.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限更新该菜品' }
    }

    // 2. 安全更新
    const updateData = {
      name,
      category,
      ingredients: ingredients || [],
      steps: steps || [],
      tips: tips || '',
      videoLinks: videoLinks || [],
      updateTime: db.serverDate()
    }

    const res = await db.collection('dishes').doc(dishId).update({ data: updateData })

    return { success: true, stats: res.stats }
  } catch (err) {
    console.error('updateDish 失败:', err)
    return { success: false, error: err.message }
  }
}
