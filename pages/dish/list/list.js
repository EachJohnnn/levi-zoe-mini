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
    console.log('【列表】查询 coupleId:', coupleId)
  
    wx.cloud.database().collection('dishes')
      .where({
        coupleId: coupleId,
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('【列表】第一条 status:', res.data[0]?.status, '_id:', res.data[0]?._id)
        this.setData({
          dishes: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error('【列表】查询失败:', err)
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

  // 点击菜品
  onDishTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/dish/detail/detail?id=${id}`
    })
  },

  // 加入美食通缉榜
  addToWantList(e) {
    const id = e.currentTarget.dataset.id
    const userInfo = wx.getStorageSync('userInfo')
    if (!id) {
      wx.showToast({ title: '菜品ID错误', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加入中...' })

    wx.cloud.callFunction({
      name: 'toggleDishWant',
      data: {
        dishId: id,
        inWantPool: true,
        nickName: userInfo?.nickName || '',
        avatarUrl: userInfo?.avatarUrl || ''
      }
    }).then(res => {
      wx.hideLoading()

      if (!res.result || !res.result.success) {
        const errorMsg = (res.result && res.result.error) || '加入失败'
        wx.showToast({ title: errorMsg, icon: 'none' })
        return
      }

      wx.showToast({ title: '已加入美食通缉榜', icon: 'success' })

      // 更新本地菜品状态，切换 UI
      const dishes = this.data.dishes.map(dish => {
        if (dish._id === id) {
          return { ...dish, inWantPool: true }
        }
        return dish
      })
      this.setData({ dishes })
    }).catch(err => {
      wx.hideLoading()
      console.error('加入美食通缉榜失败', err)
      wx.showToast({ title: err.message || '加入失败，请重试', icon: 'none' })
    })
  }
})