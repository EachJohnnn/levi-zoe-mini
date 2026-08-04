Page({
  data: {
    dishes: []
  },

  onLoad(options) {
    const dataStr = options.data
    if (!dataStr) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    try {
      const dishes = JSON.parse(decodeURIComponent(dataStr))
      this.setData({ dishes })
    } catch (e) {
      wx.showToast({ title: '数据解析失败', icon: 'none' })
    }
  },

  saveAll() {
    const coupleId = wx.getStorageSync('coupleId')
    const userInfo = wx.getStorageSync('userInfo')
    const dishes = this.data.dishes

    wx.showLoading({ title: `保存 0/${dishes.length} 道...` })

    let saved = 0
    const promises = dishes.map(dish => {
      const ingredients = (dish.ingredients || []).map(ing => {
        if (typeof ing === 'string') return ing
        if (typeof ing === 'object' && ing !== null && ing.name) {
          return ing.name + (ing.amount ? ' ' + ing.amount : '')
        }
        return String(ing)
      }).filter(s => s && s.trim() && s !== 'undefined' && s !== 'null' && s !== '[object Object]')

      return wx.cloud.database().collection('dishes').add({
        data: {
          name: dish.name,
          category: dish.category || '家常菜',
          ingredients: ingredients,
          steps: dish.steps || [],
          tips: dish.tips || '',
          videoLinks: [],
          creatorOpenid: userInfo?.openid || '',
          coupleId: coupleId,
          createTime: new Date(),
          status: 'active'
        }
      }).then(() => {
        saved++
        wx.showLoading({ title: `保存 ${saved}/${dishes.length} 道...` })
      })
    })

    Promise.all(promises)
      .then(() => {
        wx.hideLoading()
        wx.showModal({
          title: '保存成功',
          content: `已保存 ${dishes.length} 道菜到菜品库`,
          confirmText: '去菜品库',
          cancelText: '确认',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/dish/list/list'
              })
            }
            // 点击"确认"关闭弹窗，留在当前页
          }
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error(err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  }
})
