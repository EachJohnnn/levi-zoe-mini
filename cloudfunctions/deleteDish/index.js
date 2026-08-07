const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { dishId } = event
  const { OPENID } = cloud.getWXContext()

  if (!dishId) {
    return { success: false, error: '菜品ID不能为空' }
  }

  try {
    // 1. 读取菜品并校验归属
    const dishRes = await db.collection('dishes').doc(dishId).get()
    const dish = dishRes.data
    if (!dish) {
      return { success: false, error: '菜品不存在' }
    }

    // 2. 校验当前用户是否属于该情侣空间
    const coupleRes = await db.collection('couples').doc(dish.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限操作该菜品' }
    }

    // 3. 软删除
    await db.collection('dishes').doc(dishId).update({
      data: {
        status: 'deleted',
        deleteTime: new Date(),
        deletedBy: OPENID
      }
    })

    return { success: true }
  } catch (err) {
    console.error('删除失败:', err)
    return { success: false, error: err.message }
  }
}
