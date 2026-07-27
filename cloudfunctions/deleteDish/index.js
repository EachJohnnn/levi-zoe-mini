const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { dishId } = event
  if (!dishId) {
    return { success: false, error: '菜品ID不能为空' }
  }

  try {
    await cloud.database().collection('dishes').doc(dishId).remove()
    return { success: true }
  } catch (err) {
    console.error('删除失败:', err)
    return { success: false, error: err.message }
  }
}