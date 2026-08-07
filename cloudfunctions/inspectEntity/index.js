const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { type, name, coupleId } = event

  if (!type || !name || !coupleId) {
    return { success: false, msg: '参数缺失' }
  }

  const collection = type === 'restaurant' ? 'restaurants' : 'dishes'

  try {
    const res = await db.collection(collection)
      .where({
        coupleId,
        name: db.RegExp({
          regexp: name.replace(/[.*+?^${}()|[\]\\]/g, '\\$'),
          options: 'i'
        }),
        status: _.neq('deleted')
      })
      .limit(5)
      .get()

    return {
      success: true,
      count: res.data.length,
      docs: res.data.map(d => ({
        _id: d._id,
        _openid: d._openid,
        name: d.name,
        coupleId: d.coupleId,
        status: d.status,
        createTime: d.createTime,
        updateTime: d.updateTime,
        creatorOpenid: d.creatorOpenid,
        // 菜品字段
        category: d.category,
        ingredients: d.ingredients,
        steps: d.steps,
        tips: d.tips,
        videoLinks: d.videoLinks,
        inWantPool: d.inWantPool,
        // 餐厅字段
        address: d.address,
        phone: d.phone,
        pricePerPerson: d.pricePerPerson,
        cuisineTags: d.cuisineTags,
        rating: d.rating,
        wantToGo: d.wantToGo,
        visited: d.visited,
        visitCount: d.visitCount
      }))
    }
  } catch (err) {
    console.error('inspectEntity 失败:', err)
    return { success: false, msg: err.message }
  }
}
