const app = getApp()

Page({
  data: {
    restaurant: null,
    visits: [],
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ restaurantId: options.id })
      this.loadRestaurant(options.id)
      this.loadVisits(options.id)
    }
  },

  onShow() {
    const { restaurantId } = this.data
    if (restaurantId) {
      this.loadRestaurant(restaurantId)
      this.loadVisits(restaurantId)
    }
  },

  loadRestaurant(id) {
    this.setData({ loading: true })
    wx.cloud.database().collection('restaurants').doc(id).get()
      .then(res => {
        this.setData({
          restaurant: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载餐厅详情失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadVisits(restaurantId) {
    wx.cloud.database().collection('restaurantVisits')
      .where({ restaurantId })
      .orderBy('visitDate', 'desc')
      .get()
      .then(res => {
        this.setData({ visits: res.data })
      })
      .catch(err => {
        console.error('加载打卡记录失败:', err)
      })
  },

  // 标记/取消想去
  toggleWantToGo() {
    const { restaurant } = this.data
    const newValue = !restaurant.wantToGo
    wx.cloud.database().collection('restaurants').doc(restaurant._id).update({
      data: { wantToGo: newValue }
    }).then(() => {
      this.setData({ 'restaurant.wantToGo': newValue })
      wx.showToast({
        title: newValue ? '已标记为想去' : '已取消想去',
        icon: 'none'
      })
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  // 去打卡
  goVisit() {
    const { restaurant } = this.data
    wx.navigateTo({
      url: `/pages/restaurant/visit/visit?restaurantId=${restaurant._id}&name=${encodeURIComponent(restaurant.name)}`
    })
  },

  // 编辑
  goEdit() {
    const { restaurant } = this.data
    wx.navigateTo({
      url: `/pages/restaurant/edit/edit?id=${restaurant._id}`
    })
  },

  // 打开地图导航
  openMap() {
    const { restaurant } = this.data
    if (restaurant.latitude && restaurant.longitude) {
      wx.openLocation({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        name: restaurant.name,
        address: restaurant.address || ''
      })
    } else {
      // 没有经纬度，用地址搜索
      wx.showToast({ title: '暂无精确位置，请在编辑页添加', icon: 'none' })
    }
  },

  // 打开打车
  openTaxi() {
    const { restaurant } = this.data
    if (restaurant.latitude && restaurant.longitude) {
      wx.openLocation({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        name: restaurant.name,
        address: restaurant.address || ''
      })
    } else {
      wx.showToast({ title: '暂无精确位置，请在编辑页添加', icon: 'none' })
    }
  },

  // 删除
  deleteRestaurant() {
    const { restaurant } = this.data
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${restaurant.name}"吗？打卡记录也会被删除。`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          const db = wx.cloud.database()

          // 软删除餐厅
          db.collection('restaurants').doc(restaurant._id).update({
            data: { status: 'deleted' }
          }).then(() => {
            // 删除关联的打卡记录
            return db.collection('restaurantVisits').where({
              restaurantId: restaurant._id
            }).get()
          }).then(res => {
            const deletePromises = res.data.map(v =>
              db.collection('restaurantVisits').doc(v._id).remove()
            )
            return Promise.all(deletePromises)
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 800)
          }).catch(err => {
            wx.hideLoading()
            console.error('删除失败:', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  }
})
