Page({
  data: {
    dish: null,
    loading: true
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.dishId = id
    this.loadDish(id)
  },

  onShow() {
    if (this.dishId) {
      this.loadDish(this.dishId)
    }
  },

  loadDish(id) {
    const coupleId = wx.getStorageSync('coupleId')
    console.log('【菜品详情】加载菜品，id:', id, 'coupleId:', coupleId)
    wx.cloud.database().collection('dishes').doc(id).get()
      .then(res => {
        const dish = res.data
        console.log('【菜品详情】加载结果:', dish)
        if (!dish || dish.coupleId !== coupleId) {
          wx.showToast({ title: '无权限查看该菜品', icon: 'none' })
          this.setData({ loading: false })
          setTimeout(() => wx.navigateBack(), 1500)
          return
        }
        this.setData({
          dish: dish,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 跳转到编辑页
  goEdit() {
    const dish = this.data.dish
    // 把当前菜谱数据存到全局，供编辑页使用
    getApp().globalData.generatedDish = dish

    // 确保返回菜品库时恢复滚动位置
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      getApp().globalData.returnToDishList = true
      getApp().globalData.dishListScrollTop = prevPage.lastScrollTop || 0
    }

    wx.navigateTo({
      url: '/pages/dish/edit'
    })
  },

  // 删除菜品
  onDelete() {
    const that = this
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${this.data.dish.name}」吗？此操作不可恢复。`,
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          that.deleteDish()
        }
      }
    })
  },

  deleteDish() {
    const id = this.data.dish._id
    console.log('【删除】准备删除菜品，_id:', id)
  
    if (!id) {
      wx.showToast({ title: '菜品ID为空，无法删除', icon: 'none' })
      return
    }
  
    wx.showLoading({ title: '删除中...' })
  
    wx.cloud.callFunction({
      name: 'deleteDish',
      data: { dishId: id }
    }).then(res => {
      wx.hideLoading()
      console.log('【删除】云函数返回:', res.result)
  
      if (!res.result.success) {
        wx.showModal({ title: '删除失败', content: res.result.error, showCancel: false })
        return
      }
  
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadDishes) {
          prevPage.loadDishes()
        }
        wx.navigateBack()
      }, 1500)
    }).catch(err => {
      wx.hideLoading()
      console.error('【删除】云函数调用失败:', err)
      wx.showModal({ title: '删除失败', content: err.message, showCancel: false })
    })
  },
  
  addToWantList() {
    const dish = this.data.dish
    const userInfo = wx.getStorageSync('userInfo')
    if (!dish || !dish._id) {
      wx.showToast({ title: '菜品数据错误', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加入中...' })

    wx.cloud.callFunction({
      name: 'toggleDishWant',
      data: {
        dishId: dish._id,
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

      // 更新本地数据
      this.setData({
        'dish.inWantPool': true
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('加入美食通缉榜失败', err)
      wx.showToast({ title: err.message || '加入失败，请重试', icon: 'none' })
    })
  }
})