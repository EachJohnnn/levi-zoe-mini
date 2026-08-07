const app = getApp()

Page({
  data: {
    userInfo: null,
    coupleId: null,
    coupleName: '',
    coupleMembers: [],
    partnerInfo: null,
    tonightMenu: null,
    wantDishes: [],
    loading: true,
    isCreator: false,
    memberMap: {}
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const userInfo = wx.getStorageSync('userInfo')
    const coupleId = wx.getStorageSync('coupleId')

    if (!userInfo) {
      // 未登录，跳转到登录页
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    this.setData({ userInfo, coupleId })

    if (coupleId) {
      this.loadCoupleInfo(coupleId)
      this.loadTonightMenu(coupleId)
      this.loadWantDishes(coupleId)
    } else {
      this.setData({ loading: false })
    }
  },

  // 加载情侣空间信息
  loadCoupleInfo(coupleId) {
    const myOpenid = this.data.userInfo?.openid
    wx.cloud.database().collection('couples').doc(coupleId).get()
      .then(res => {
        const data = res.data
        const members = data.members || []
        const isCreator = data.creatorOpenid === myOpenid
        this.setData({
          coupleName: data.name || '我们的小厨房',
          coupleMembers: members,
          isCreator,
          loading: false
        })
        // 查询对方用户信息
        const partnerOpenid = members.find(m => m !== myOpenid)
        // 成员信息会在 loadMemberInfo 中统一拉取并设置 partnerInfo
        // 加载所有成员信息（用于显示厨师头像）
        this.loadMemberInfo(members)
      })
      .catch(err => {
        console.error('加载情侣空间失败:', err)
        this.setData({ loading: false })
      })
  },

  // 加载成员信息映射
  loadMemberInfo(members) {
    const coupleId = this.data.coupleId
    if (!coupleId) return

    wx.cloud.callFunction({
      name: 'getCoupleMembers',
      data: { coupleId }
    })
      .then(res => {
        const result = res.result || {}
        if (!result.success) {
          console.error('加载成员信息失败:', result.error)
          return
        }
        const memberMap = {}
        ;(result.members || []).forEach(u => {
          memberMap[u.openid] = {
            openid: u.openid,
            nickName: u.nickName || u.openid?.slice(0, 8) || '未知',
            avatarUrl: u.avatarUrl || ''
          }
        })
        // 同时设置对方信息，避免客户端查询 users 被安全规则过滤只能查到自己
        const myOpenid = this.data.userInfo?.openid
        const partnerOpenid = (members || []).find(m => m !== myOpenid)
        const partnerInfo = partnerOpenid
          ? (memberMap[partnerOpenid] || { openid: partnerOpenid, nickName: 'TA', avatarUrl: '' })
          : { nickName: 'TA', avatarUrl: '' }
        this.setData({ memberMap, partnerInfo })
      })
      .catch(err => {
        console.error('加载成员信息失败:', err)
      })
  },

  // 删除今晚菜单（软删除）
  deleteTonightMenu() {
    const { tonightMenu, coupleId, userInfo } = this.data
    if (!tonightMenu || !coupleId) return
    wx.showModal({
      title: '确认删除',
      content: '确定要删除今晚的菜单吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.database().collection('tonightMenus').doc(tonightMenu._id).update({
            data: {
              status: 'deleted',
              deleteTime: new Date(),
              deletedBy: userInfo?.openid || ''
            }
          })
            .then(() => {
              this.setData({ tonightMenu: null })
              wx.showToast({ title: '已删除', icon: 'success' })
            })
            .catch(err => {
              console.error(err)
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  },

  // 加载今晚菜单
  loadTonightMenu(coupleId) {
    const _ = wx.cloud.database().command
    wx.cloud.database().collection('tonightMenus')
      .where({
        coupleId,
        status: _.neq('deleted')
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const menu = res.data[0]
          // 加载菜品详情
          this.loadMenuDishes(menu)
        } else {
          this.setData({ tonightMenu: null })
        }
      })
      .catch(err => {
        console.error('加载今晚菜单失败:', err)
      })
  },

  // 加载菜单中的菜品
  loadMenuDishes(menu) {
    const dishIds = menu.dishes || []
    if (dishIds.length === 0) {
      this.setData({ tonightMenu: { ...menu, dishList: [] } })
      return
    }

    // 分批查询菜品
    const promises = dishIds.map(id =>
      wx.cloud.database().collection('dishes').doc(id).get().catch(() => null)
    )

    Promise.all(promises).then(results => {
      const dishList = results.filter(r => r && r.data).map(r => r.data)
      this.setData({
        tonightMenu: { ...menu, dishList }
      })
    })
  },

  // 加载美食通缉榜（Top 3）
  loadWantDishes(coupleId) {
    wx.cloud.database().collection('dishes')
      .where({
        coupleId,
        inWantPool: true,
        status: 'active'
      })
      .orderBy('wantPoolTime', 'desc')
      .limit(3)
      .get()
      .then(res => {
        this.setData({ wantDishes: res.data })
      })
      .catch(err => {
        console.error('加载通缉榜失败:', err)
      })
  },

  // 跳转到今晚菜单
  goTonightMenu() {
    wx.switchTab({ url: '/pages/cook/cook' })
    // 延迟后再跳转子页面（因为 switchTab 是异步的）
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/dish/tonight/tonight' })
    }, 300)
  },

  // 跳转到烹饪页面
  goCooking() {
    if (!this.data.tonightMenu) return
    wx.navigateTo({
      url: '/pages/dish/cooking/cooking'
    })
  },

  // 跳转到美食通缉榜
  goWantList() {
    wx.switchTab({ url: '/pages/cook/cook' })
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/dish/want-list/want-list' })
    }, 300)
  },

  // 跳转到添加菜品
  goAddDish() {
    wx.switchTab({ url: '/pages/cook/cook' })
  },

  // 跳转到盲盒
  goBlindbox() {
    wx.switchTab({ url: '/pages/cook/cook' })
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/dish/blindbox/select/select' })
    }, 300)
  },

  // 跳转到绑定页
  goBindCouple() {
    wx.navigateTo({ url: '/pages/index/index' })
  },

  // 编辑情侣空间名称
  editCoupleName() {
    if (!this.data.isCreator) {
      wx.showToast({ title: '只有创建者可以修改', icon: 'none' })
      return
    }
    wx.showModal({
      title: '修改空间名称',
      placeholderText: '输入新名称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newName = res.content.trim()
          wx.cloud.database().collection('couples').doc(this.data.coupleId).update({
            data: { name: newName }
          }).then(() => {
            this.setData({ coupleName: newName })
            wx.showToast({ title: '修改成功', icon: 'success' })
          }).catch(err => {
            console.error(err)
            wx.showToast({ title: '修改失败', icon: 'none' })
          })
        }
      }
    })
  }
})
