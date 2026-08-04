const app = getApp()

Page({
  data: {
    restaurants: [],
    markers: [],
    selectedRestaurant: null,
    loading: true,
    latitude: 39.9042,  // 默认北京
    longitude: 116.4074,
    scale: 12
  },

  onShow() {
    this.loadRestaurants()
  },

  loadRestaurants() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      this.setData({ loading: false })
      return
    }

    wx.cloud.database().collection('restaurants')
      .where({
        coupleId: coupleId,
        status: 'active'
      })
      .get()
      .then(res => {
        const restaurants = res.data
        // 构建 markers
        const markers = restaurants
          .filter(r => r.latitude && r.longitude)
          .map((r, index) => ({
            id: index,
            latitude: r.latitude,
            longitude: r.longitude,
            title: r.name,
            width: 20,
            height: 30,
            label: {
              content: r.name,
              color: '#333',
              fontSize: 12,
              bgColor: '#fff',
              borderRadius: 4,
              padding: 4,
              display: 'ALWAYS'
            }
          }))

        // 计算地图中心点
        let centerLat = this.data.latitude
        let centerLng = this.data.longitude
        if (markers.length > 0) {
          const avgLat = markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length
          const avgLng = markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length
          centerLat = avgLat
          centerLng = avgLng
        }

        this.setData({
          restaurants,
          markers,
          loading: false,
          latitude: centerLat,
          longitude: centerLng
        })
      })
      .catch(err => {
        console.error('加载餐厅失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 点击标记
  onMarkerTap(e) {
    const { markers, restaurants } = this.data
    const marker = markers[e.detail.markerId]
    if (!marker) return

    // 找到对应的餐厅
    const restaurant = restaurants.find(r =>
      r.name === marker.title &&
      r.latitude === marker.latitude &&
      r.longitude === marker.longitude
    )

    if (restaurant) {
      this.setData({ selectedRestaurant: restaurant })
    }
  },

  // 点击地图空白处
  onMapTap() {
    this.setData({ selectedRestaurant: null })
  },

  // 跳转到餐厅详情
  goDetail() {
    const { selectedRestaurant } = this.data
    if (!selectedRestaurant) return
    wx.navigateTo({
      url: `/pages/restaurant/detail/detail?id=${selectedRestaurant._id}`
    })
  },

  // 定位到当前位置
  locateCurrentPosition() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 14
        })
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' })
      }
    })
  }
})
