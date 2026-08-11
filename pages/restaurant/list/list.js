const app = getApp()

// Haversine 公式计算两点距离（单位：米）
function getDistance(lat1, lng1, lat2, lng2) {
  const rad = (d) => d * Math.PI / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371000 * c
}

// 格式化距离
function formatDistance(meters) {
  if (meters < 1000) {
    return Math.round(meters) + 'm'
  } else {
    return (meters / 1000).toFixed(1) + 'km'
  }
}

Page({
  data: {
    restaurants: [],
    filteredRestaurants: [],
    loading: true,
    searchKeyword: '',
    activeFilter: 'all',
    filterTabs: [
      { key: 'all', label: '全部' },
      { key: 'want', label: '想去' },
      { key: 'visited', label: '已打卡' }
    ],
    cuisineTags: ['全部菜系'],
    activeCuisine: '全部菜系',
    distanceOptions: [
      { label: '不限', value: 0 },
      { label: '1km内', value: 1000 },
      { label: '3km内', value: 3000 },
      { label: '5km内', value: 5000 }
    ],
    activeDistance: 0,
    sortOptions: [
      { key: 'distance', label: '距离最近' },
      { key: 'timeDesc', label: '最新添加' },
      { key: 'timeAsc', label: '最早添加' }
    ],
    sortBy: 'distance',
    userLocation: null,
    locationError: ''
  },

  onShow() {
    this.getUserLocation().then(() => {
      this.loadRestaurants()
    }).catch(() => {
      this.loadRestaurants()
    })
  },

  // 获取用户当前位置
  getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.setData({
            userLocation: {
              latitude: res.latitude,
              longitude: res.longitude
            }
          })
          resolve()
        },
        fail: (err) => {
          console.error('获取位置失败:', err)
          this.setData({
            locationError: '未获取到位置，距离筛选和距离显示可能不准确'
          })
          reject(err)
        }
      })
    })
  },

  loadRestaurants() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    wx.cloud.database().collection('restaurants')
      .where({
        coupleId: coupleId,
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const restaurants = res.data
        // 计算距离
        const { userLocation } = this.data
        if (userLocation) {
          restaurants.forEach(r => {
            if (r.latitude && r.longitude) {
              r.distance = getDistance(
                userLocation.latitude, userLocation.longitude,
                r.latitude, r.longitude
              )
              r.distanceText = formatDistance(r.distance)
            } else {
              r.distance = Infinity
              r.distanceText = ''
            }
          })
        }

        // 按当前排序规则排序
        this.sortRestaurants(restaurants)

        // 收集菜系标签
        const tagSet = new Set()
        restaurants.forEach(r => {
          if (r.cuisineTags && r.cuisineTags.length > 0) {
            r.cuisineTags.forEach(tag => {
              if (tag && tag.trim()) tagSet.add(tag.trim())
            })
          }
        })

        this.setData({
          restaurants,
          cuisineTags: ['全部菜系', ...Array.from(tagSet)],
          loading: false
        })
        this.applyFilter()
      })
      .catch(err => {
        console.error('加载餐厅列表失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
    this.applyFilter()
  },

  // 切换全部/想去/已打卡筛选
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter })
    this.applyFilter()
  },

  // 选择菜系
  selectCuisine(e) {
    const cuisine = e.currentTarget.dataset.cuisine
    this.setData({ activeCuisine: cuisine })
    this.applyFilter()
  },

  // 选择距离
  selectDistance(e) {
    const value = e.currentTarget.dataset.value
    if (value > 0 && !this.data.userLocation) {
      wx.showLoading({ title: '定位中...' })
      this.getUserLocation().then(() => {
        wx.hideLoading()
        this.setData({ activeDistance: value })
        this.loadRestaurants()
      }).catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '请先授权位置信息', icon: 'none' })
      })
      return
    }
    this.setData({ activeDistance: value })
    this.applyFilter()
  },

  // 切换排序
  switchSort(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy })
    // 重新排序已有数据
    const restaurants = this.data.restaurants
    this.sortRestaurants(restaurants)
    this.setData({ restaurants })
    this.applyFilter()
  },

  // 对餐厅数组按当前规则排序
  sortRestaurants(restaurants) {
    const { sortBy, userLocation } = this.data
    if (sortBy === 'distance' && userLocation) {
      restaurants.sort((a, b) => {
        if (a.distance === Infinity && b.distance === Infinity) return 0
        if (a.distance === Infinity) return 1
        if (b.distance === Infinity) return -1
        return a.distance - b.distance
      })
    } else if (sortBy === 'timeDesc') {
      restaurants.sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
    } else if (sortBy === 'timeAsc') {
      restaurants.sort((a, b) => (a.createTime || 0) - (b.createTime || 0))
    }
  },

  // 应用筛选+搜索
  applyFilter() {
    const { restaurants, searchKeyword, activeFilter, activeCuisine, activeDistance, userLocation } = this.data

    let result = restaurants

    // 按标签筛选
    if (activeFilter === 'want') {
      result = result.filter(r => r.wantToGo)
    } else if (activeFilter === 'visited') {
      result = result.filter(r => r.visited)
    }

    // 按菜系筛选
    if (activeCuisine && activeCuisine !== '全部菜系') {
      result = result.filter(r => r.cuisineTags && r.cuisineTags.includes(activeCuisine))
    }

    // 按距离筛选
    if (activeDistance > 0 && userLocation) {
      result = result.filter(r => r.distance != null && r.distance <= activeDistance)
    }

    // 按关键词搜索
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      result = result.filter(r =>
        (r.name && r.name.toLowerCase().includes(kw)) ||
        (r.address && r.address.toLowerCase().includes(kw)) ||
        (r.cuisineTags && r.cuisineTags.some(tag => tag.toLowerCase().includes(kw)))
      )
    }

    this.setData({ filteredRestaurants: result })
  },

  // 点击餐厅卡片
  onRestaurantTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/restaurant/detail/detail?id=${id}`
    })
  },

  // 跳转到地图模式
  goMap() {
    wx.navigateTo({
      url: '/pages/restaurant/map/map'
    })
  },

  // 添加餐厅
  goAddRestaurant() {
    wx.navigateTo({
      url: '/pages/restaurant/edit/edit'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.getUserLocation().then(() => {
      this.loadRestaurants()
    }).catch(() => {
      this.loadRestaurants()
    })
    wx.stopPullDownRefresh()
  }
})
