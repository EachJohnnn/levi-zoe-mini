const app = getApp()

Page({
  data: {
    dishes: [],
    loading: true
  },

  onShow() {
    this.loadDishes()
  },

  loadDishes() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    wx.cloud.database().collection('dishes')
      .where({
        coupleId: coupleId,
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({
          dishes: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 添加新菜
  goAddDish() {
    wx.showModal({
      title: '添加新菜品',
      placeholderText: '请输入菜名（如：番茄炒蛋）',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const dishName = res.content.trim()
          if (!dishName) return
  
          // 把菜名存起来，跳转到编辑页之前先生成
          wx.showLoading({ title: 'AI正在生成菜谱...' })
  
          wx.cloud.callFunction({
            name: 'generateDish',
            data: { dishName }
          }).then(cloudRes => {
            wx.hideLoading()
            if (cloudRes.result.success) {
              getApp().globalData.generatedDish = cloudRes.result.dishData
              wx.navigateTo({
                url: '/pages/dish/edit'
              })
            } else {
              wx.showToast({ title: '生成失败', icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
            wx.showToast({ title: '生成失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 点击菜品（暂时先打印，后续做详情页）
  onDishTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/dish/detail/detail?id=${id}`
    })
  }
})