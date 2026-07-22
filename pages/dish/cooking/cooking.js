Page({
  data: {
    menu: null,
    dishes: [],
    sop: null, // AI 生成的 SOP
    currentStage: 'prep', // prep / cooking
    completedSteps: []
  },

  onLoad(options) {
    const menuId = options.menuId
    if (menuId) this.loadMenu(menuId)
  },

  loadMenu(menuId) {
    wx.cloud.database().collection('tonightMenus').doc(menuId).get()
      .then(res => {
        this.setData({ menu: res.data })
        this.loadDishes(res.data.dishes)
      })
  },

  loadDishes(dishIds) {
    wx.cloud.database().collection('dishes')
      .where({ _id: wx.cloud.database().command.in(dishIds) })
      .get()
      .then(res => {
        this.setData({ dishes: res.data })
        this.generateSOP(res.data)
      })
  },

  generateSOP(dishes) {
    wx.showLoading({ title: 'AI规划做菜流程...' })

    wx.cloud.callFunction({
      name: 'generateCookingSOP',
      data: { dishes: dishes.map(d => ({ name: d.name, ingredients: d.ingredients, steps: d.steps })) }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        this.setData({ sop: res.result.sop })
      } else {
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
    })
  }
})