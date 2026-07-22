const app = getApp()

Page({
  data: {
    wantDishes: [],
    loading: true
  },

  onShow() {
    this.loadWantPool()
  },

  loadWantPool() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      this.setData({ loading: false })
      return
    }

    wx.cloud.database().collection('dishes')
      .where({
        coupleId: coupleId,
        inWantPool: true,
        status: 'active'
      })
      .orderBy('wantPoolTime', 'desc')
      .get()
      .then(res => {
        this.setData({
          wantDishes: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
      })
  },

  // 移除想吃池
  removeFromWant(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认移除',
      content: '确定从想吃池移除吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.database().collection('dishes').doc(id).update({
            data: {
              inWantPool: false,
              wantPoolTime: null
            }
          }).then(() => {
            this.loadWantPool()
            wx.showToast({ title: '已移除' })
          })
        }
      }
    })
  },

  // 生成今晚菜单（后续实现）
  generateTonightMenu() {
    const that = this
    if (this.data.wantDishes.length === 0) {
      wx.showToast({ title: '想吃池为空', icon: 'none' })
      return
    }
  
    // 简单实现：全选想吃池生成（后续可做多选）
    wx.showModal({
      title: '生成今晚菜单',
      content: `将从想吃池中选出 ${this.data.wantDishes.length} 道菜生成今晚菜单？`,
      success(res) {
        if (res.confirm) {
          that.doGenerateTonight()
        }
      }
    })
  },
  
  doGenerateTonight() {
    const coupleId = wx.getStorageSync('coupleId')
    const dishes = this.data.wantDishes.map(d => d._id)
  
    wx.showLoading({ title: '生成中...' })
  
    wx.cloud.database().collection('tonightMenus').add({
      data: {
        coupleId: coupleId,
        date: new Date(),
        dishes: dishes,
        comments: [],
        createTime: new Date()
      }
    }).then(res => {
      wx.hideLoading()
      wx.showToast({ title: '今晚菜单已生成！', icon: 'success' })
      console.log('今晚菜单 _id:', res._id)
      // 后续可跳转到菜单详情页
      wx.navigateTo({
        url: `/pages/dish/tonight/tonight?id=${res._id}`
      })
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  }
})