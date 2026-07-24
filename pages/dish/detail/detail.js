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
    this.loadDish(id)
  },

  loadDish(id) {
    wx.cloud.database().collection('dishes').doc(id).get()
      .then(res => {
        this.setData({
          dish: res.data,
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
    wx.showLoading({ title: '删除中...' })

    wx.cloud.database().collection('dishes').doc(id).update({
      data: {
        status: 'deleted'   // 软删除，保留数据
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  },
  
  addToWantList() {
    const dish = this.data.dish
    if (!dish || !dish._id) {
      wx.showToast({ title: '菜品数据错误', icon: 'none' })
      return
    }
  
    wx.showLoading({ title: '加入中...' })
  
    wx.cloud.database().collection('dishes').doc(dish._id).update({
      data: {
        inWantPool: true,
        wantPoolTime: new Date()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已加入想吃池', icon: 'success' })
      
      // 更新本地数据
      this.setData({
        'dish.inWantPool': true
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('加入想吃池失败', err)
      wx.showToast({ title: '加入失败，请重试', icon: 'none' })
    })
  }
})