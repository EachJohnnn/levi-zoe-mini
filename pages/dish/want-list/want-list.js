const app = getApp()

Page({
  data: {
    wantDishes: [],
    loading: true,
    memberMap: {}
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
        const wantDishes = res.data
        this.setData({
          wantDishes,
          loading: false
        })
        this.loadMemberInfo(wantDishes)
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
      })
  },

  // 加载加菜人信息
  loadMemberInfo(dishes) {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) return

    wx.cloud.callFunction({
      name: 'getCoupleMembers',
      data: { coupleId }
    })
      .then(res => {
        const result = res.result || {}
        if (!result.success) {
          console.error('加载用户信息失败:', result.error)
          return
        }
        const memberMap = {}
        ;(result.members || []).forEach(u => {
          memberMap[u.openid] = {
            nickName: u.nickName || u.openid?.slice(0, 8) || '未知',
            avatarUrl: u.avatarUrl || ''
          }
        })
        this.setData({ memberMap })
      })
      .catch(err => {
        console.error('加载用户信息失败:', err)
      })
  },

  // 移除想吃池
  removeFromWant(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认移除',
      content: '确定从美食通缉榜移除吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'toggleDishWant',
            data: { dishId: id, inWantPool: false }
          }).then(res => {
            if (res.result && res.result.success) {
              this.loadWantPool()
              wx.showToast({ title: '已移除' })
            } else {
              const errorMsg = (res.result && res.result.error) || '移除失败'
              wx.showToast({ title: errorMsg, icon: 'none' })
            }
          }).catch(err => {
            console.error('移除美食通缉榜失败:', err)
            wx.showToast({ title: err.message || '移除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 生成今晚菜单（后续实现）
  generateTonightMenu() {
    const that = this
    if (this.data.wantDishes.length === 0) {
      wx.showToast({ title: '通缉榜为空', icon: 'none' })
      return
    }
  
    // 简单实现：全选想吃池生成（后续可做多选）
    wx.showModal({
      title: '生成今晚菜单',
      content: `将从美食通缉榜中选出 ${this.data.wantDishes.length} 道菜生成今晚菜单？`,
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
        dishChefs: {},
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