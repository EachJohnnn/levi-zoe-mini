const app = getApp()

// 判断两个日期是否为同一天（本地时间）
function isSameDay(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

Page({
  data: {
    features: [
      { icon: '📚', label: '菜品库', url: '/pages/dish/list/list' },
      { icon: '📋', label: '美食通缉榜', url: '/pages/dish/want-list/want-list' },
      { icon: '🍽️', label: '今晚菜单', url: '/pages/dish/tonight/tonight' },
      { icon: '🎁', label: '盲盒新菜', url: '/pages/dish/blindbox/select/select' },
      { icon: '🧊', label: '我的冰箱', url: '/pages/fridge/fridge' },
      { icon: '🛒', label: '购物清单', url: '/pages/dish/shopping-list/shopping-list' }
    ],
    coupleId: '',
    stats: { dishCount: 0, wantCount: 0, tonightCount: 0 },
    latestDishes: [],
    wantPreview: [],
    tonightMenu: null,
    loading: true
  },

  onShow() {
    const coupleId = wx.getStorageSync('coupleId')
    this.setData({ coupleId, loading: true })
    if (coupleId) {
      this.loadStats(coupleId)
    } else {
      this.setData({ loading: false })
    }
  },

  // 加载统计数据与预览内容
  loadStats(coupleId) {
    const db = wx.cloud.database()
    const _ = db.command

    const dishCountQuery = db.collection('dishes')
      .where({ coupleId, status: 'active' })
      .count()

    const wantCountQuery = db.collection('dishes')
      .where({ coupleId, inWantPool: true, status: 'active' })
      .count()

    const dishQuery = db.collection('dishes')
      .where({ coupleId, status: 'active' })
      .orderBy('createTime', 'desc')
      .limit(3)
      .get()

    const wantQuery = db.collection('dishes')
      .where({ coupleId, inWantPool: true, status: 'active' })
      .orderBy('wantPoolTime', 'desc')
      .limit(3)
      .get()

    const tonightQuery = db.collection('tonightMenus')
      .where({ coupleId, status: _.neq('deleted') })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()

    Promise.all([dishCountQuery, wantCountQuery, dishQuery, wantQuery, tonightQuery])
      .then(([dishCountRes, wantCountRes, dishRes, wantRes, tonightRes]) => {
        const latestDishes = dishRes.data || []
        const wantPreview = wantRes.data || []
        let tonightMenu = null
        if (tonightRes.data.length > 0) {
          const menu = tonightRes.data[0]
          const menuDate = menu.date || menu.createTime
          // 只统计/展示当天的菜单
          if (isSameDay(menuDate, new Date())) {
            const dishes = menu.dishes || []
            tonightMenu = {
              _id: menu._id,
              name: menu.name || '今晚菜单',
              dishCount: dishes.length,
              dishes: dishes
            }
          }
        }

        this.setData({
          stats: {
            dishCount: dishCountRes.total || 0,
            wantCount: wantCountRes.total || 0,
            tonightCount: tonightMenu ? tonightMenu.dishCount : 0
          },
          latestDishes,
          wantPreview,
          tonightMenu,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载小厨房数据失败:', err)
        this.setData({ loading: false })
      })
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
  },

  // 跳转菜品库
  goDishList() {
    wx.navigateTo({ url: '/pages/dish/list/list' })
  },

  // 跳转通缉榜
  goWantList() {
    wx.navigateTo({ url: '/pages/dish/want-list/want-list' })
  },

  // 跳转今晚菜单
  goTonightMenu() {
    wx.navigateTo({ url: '/pages/dish/tonight/tonight' })
  },

  // 点击最近菜品
  onLatestTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/dish/detail/detail?id=${id}` })
  }
})
