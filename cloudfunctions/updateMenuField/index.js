const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 允许通过此云函数更新的字段白名单
const ALLOWED_FIELDS = ['shoppingListId', 'sop']

exports.main = async (event, context) => {
  const { menuId, field, value } = event
  const { OPENID } = cloud.getWXContext()

  if (!menuId || !field) {
    return { success: false, error: '参数缺失' }
  }

  if (!ALLOWED_FIELDS.includes(field)) {
    return { success: false, error: `字段 ${field} 不允许通过此接口更新` }
  }

  try {
    // 1. 读取菜单并校验归属
    const menuRes = await db.collection('tonightMenus').doc(menuId).get()
    const menu = menuRes.data
    if (!menu) {
      return { success: false, error: '菜单不存在' }
    }

    const coupleRes = await db.collection('couples').doc(menu.coupleId).get().catch(() => ({ data: null }))
    const couple = coupleRes.data
    if (!couple || !couple.members || !couple.members.includes(OPENID)) {
      return { success: false, error: '无权限操作该菜单' }
    }

    // 2. 安全更新（只更新白名单字段）
    await db.collection('tonightMenus').doc(menuId).update({
      data: { [field]: value }
    })

    return { success: true }
  } catch (err) {
    console.error('updateMenuField 失败:', err)
    return { success: false, error: err.message }
  }
}
