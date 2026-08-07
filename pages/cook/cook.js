Page({
  data: {
    features: [
      { icon: '📚', label: '菜品库', url: '/pages/dish/list/list' },
      { icon: '📋', label: '美食通缉榜', url: '/pages/dish/want-list/want-list' },
      { icon: '🍽️', label: '今晚菜单', url: '/pages/dish/tonight/tonight' },
      { icon: '🎁', label: '盲盒新菜', url: '/pages/dish/blindbox/select/select' },
      { icon: '🧊', label: '我的冰箱', url: '/pages/fridge/fridge' },
      { icon: '🛒', label: '购物清单', url: '/pages/dish/shopping-list/shopping-list' }
    ]
  },

  onFeatureTap(e) {
    const url = e.currentTarget.dataset.url
    if (url === '/pages/dish/shopping-list/shopping-list') {
      // 购物清单需要查询最新列表再跳转
      const coupleId = wx.getStorageSync('coupleId')
      if (!coupleId) {
        wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
        return
      }
      wx.cloud.database().collection('shoppingLists')
        .where({ coupleId })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get()
        .then(res => {
          if (res.data.length > 0) {
            wx.navigateTo({ url: `/pages/dish/shopping-list/shopping-list?id=${res.data[0]._id}` })
          } else {
            wx.showToast({ title: '还没有购物清单', icon: 'none' })
          }
        })
        .catch(() => {
          wx.showToast({ title: '加载失败', icon: 'none' })
        })
    } else {
      wx.navigateTo({ url })
    }
  },

  goAddDish() {
    wx.showModal({
      title: '添加新菜品',
      placeholderText: '请输入菜名（如：番茄炒蛋）',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const dishName = res.content.trim()
          wx.showLoading({ title: 'AI正在生成菜谱...' })
          wx.cloud.callFunction({
            name: 'generateDish',
            data: { dishName }
          }).then(cloudRes => {
            wx.hideLoading()
            if (cloudRes.result.success) {
              getApp().globalData.generatedDish = cloudRes.result.dishData
              wx.navigateTo({ url: '/pages/dish/edit' })
            } else {
              wx.showToast({ title: '生成失败', icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            wx.showToast({ title: '生成失败', icon: 'none' })
          })
        }
      }
    })
  }
})
