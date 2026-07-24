const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { menuId, field, value } = event

  if (!menuId || !field) {
    return { success: false, error: '参数缺失' }
  }

  try {
    // 尝试用 update 写入（若字段不存在则创建）
    await db.collection('tonightMenus').doc(menuId).update({
      data: { [field]: value }
    })
    return { success: true }
  } catch (err) {
    // 如果 update 失败（如权限不足），尝试用 set 覆盖整个文档（需先读取）
    try {
      const doc = await db.collection('tonightMenus').doc(menuId).get()
      const data = doc.data || {}
      data[field] = value
      await db.collection('tonightMenus').doc(menuId).set({ data })
      return { success: true }
    } catch (err2) {
      return { success: false, error: err2.message }
    }
  }
}