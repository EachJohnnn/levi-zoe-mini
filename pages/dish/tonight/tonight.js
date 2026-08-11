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
    menu: null,
    dishes: [],
    loading: true,
    formattedDate: '',
    coupleId: '',
    isAuthorized: false,
    memberMap: {},
    memberList: [],
    showHistory: false,
    historyList: [],
    showArchiveTip: false
  },

  onLoad(options) {
    const coupleId = wx.getStorageSync('coupleId')
    this.setData({ coupleId })
    const id = options.id
    if (id) {
      this.loadTonightMenu(id)
    } else {
      this.loadLatestMenu()
    }
  },

  onShow() {
    // 从购物清单页面返回后刷新菜单数据
    if (this.data.menu && this.data.menu._id) {
      this.loadTonightMenu(this.data.menu._id)
    }
  },

  loadTonightMenu(id) {
    const currentCoupleId = this.data.coupleId
    this.setData({ loading: true })
    wx.cloud.database().collection('tonightMenus').doc(id).get()
      .then(res => {
        const menu = res.data
        if (!menu || menu.coupleId !== currentCoupleId) {
          wx.showToast({ title: '无权限查看该菜单', icon: 'none' })
          this.setData({ loading: false, isAuthorized: false })
          setTimeout(() => wx.navigateBack(), 1500)
          return
        }
        this.setData({
          menu,
          formattedDate: this.formatDate(menu.date),
          loading: false,
          isAuthorized: true
        })
        this.loadDishes(menu.dishes)
        this.loadMemberInfo(menu.coupleId)
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadLatestMenu() {
    const coupleId = this.data.coupleId
    if (!coupleId) {
      this.setData({ loading: false })
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      return
    }

    this.setData({ loading: true, showArchiveTip: false })
    const _ = wx.cloud.database().command
    wx.cloud.database().collection('tonightMenus')
      .where({
        coupleId: coupleId,
        status: _.neq('deleted')
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const menu = res.data[0]
          const menuDate = menu.date || menu.createTime
          const today = new Date()

          // 如果菜单不是今天的，自动归档
          if (!isSameDay(menuDate, today)) {
            this.archiveMenu(menu._id, () => {
              this.setData({
                menu: null,
                dishes: [],
                loading: false,
                isAuthorized: false,
                showArchiveTip: true
              })
            })
            return
          }

          this.setData({
            menu,
            formattedDate: this.formatDate(menu.date),
            loading: false,
            isAuthorized: true
          })
          this.loadDishes(menu.dishes)
          this.loadMemberInfo(menu.coupleId)
        } else {
          this.setData({ loading: false, isAuthorized: false })
        }
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 归档旧菜单
  archiveMenu(menuId, callback) {
    wx.cloud.database().collection('tonightMenus').doc(menuId).update({
      data: {
        status: 'deleted',
        archiveTime: new Date()
      }
    }).then(() => {
      if (typeof callback === 'function') callback()
    }).catch(err => {
      console.error('归档菜单失败:', err)
      if (typeof callback === 'function') callback()
    })
  },

  loadDishes(dishIds) {
    if (!dishIds || dishIds.length === 0) {
      this.setData({ dishes: [] })
      return
    }
    wx.cloud.database().collection('dishes')
      .where({ _id: wx.cloud.database().command.in(dishIds) })
      .get()
      .then(res => this.setData({ dishes: res.data }))
      .catch(err => console.error(err))
  },

  // 加载情侣空间成员信息
  loadMemberInfo(coupleId) {
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
        const memberList = []
        ;(result.members || []).forEach(u => {
          const info = {
            openid: u.openid,
            nickName: u.nickName || u.openid?.slice(0, 8) || '未知',
            avatarUrl: u.avatarUrl || ''
          }
          memberMap[u.openid] = info
          memberList.push(info)
        })
        this.setData({ memberMap, memberList })
      })
      .catch(err => {
        console.error('加载成员信息失败:', err)
      })
  },

  // 指定厨师
  assignChef(e) {
    const { isAuthorized, menu, memberList } = this.data
    if (!isAuthorized || !menu) {
      wx.showToast({ title: '无权限操作', icon: 'none' })
      return
    }
    if (memberList.length === 0) {
      wx.showToast({ title: '未加载成员信息', icon: 'none' })
      return
    }
    const dishId = e.currentTarget.dataset.id
    const itemList = memberList.map(m => m.nickName)
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const chef = memberList[res.tapIndex]
        this.updateDishChef(dishId, chef.openid)
      }
    })
  },

  // 更新菜品厨师
  updateDishChef(dishId, openid) {
    const { menu } = this.data
    const dishChefs = { ...(menu.dishChefs || {}) }
    dishChefs[dishId] = openid
    wx.showLoading({ title: '指定中...' })
    wx.cloud.database().collection('tonightMenus').doc(menu._id).update({
      data: { dishChefs }
    }).then(() => {
      wx.hideLoading()
      this.setData({ 'menu.dishChefs': dishChefs })
      wx.showToast({ title: '已指定厨师', icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      console.error('指定厨师失败:', err)
      wx.showToast({ title: '指定失败', icon: 'none' })
    })
  },

  addComment(e) {
    const { isAuthorized } = this.data
    if (!isAuthorized) {
      wx.showToast({ title: '无权限操作', icon: 'none' })
      return
    }
    const dishId = e.currentTarget.dataset.id
    wx.showModal({
      title: '添加评论',
      placeholderText: '今天这道菜怎么样？',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const comment = {
            dishId: dishId,
            content: res.content,
            user: getApp().globalData.userInfo?.nickName || '匿名',
            time: new Date()
          }

          wx.cloud.database().collection('tonightMenus').doc(this.data.menu._id).update({
            data: {
              comments: wx.cloud.database().command.push(comment)
            }
          }).then(() => {
            wx.showToast({ title: '评论已添加' })
            this.loadTonightMenu(this.data.menu._id)
          }).catch(err => {
            console.error(err)
            wx.showToast({ title: '评论失败', icon: 'none' })
          })
        }
      }
    })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  },

  // 一键清空/重置菜单
  resetMenu() {
    const { menu } = this.data
    if (!menu || !menu._id) return
    wx.showModal({
      title: '确认清空菜单',
      content: '清空后可以从美食通缉榜或菜品库重新生成今晚菜单。',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清空中...' })
          wx.cloud.database().collection('tonightMenus').doc(menu._id).update({
            data: {
              status: 'deleted',
              deleteTime: new Date()
            }
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已清空菜单', icon: 'success' })
            this.setData({ menu: null, dishes: [], isAuthorized: false })
          }).catch(err => {
            wx.hideLoading()
            console.error('清空菜单失败:', err)
            wx.showToast({ title: '清空失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 从通缉榜生成
  goWantList() {
    wx.navigateTo({ url: '/pages/dish/want-list/want-list' })
  },

  // 从菜品库挑选
  goDishList() {
    wx.navigateTo({ url: '/pages/dish/list/list' })
  },

  // 打开历史记录
  openHistory() {
    this.setData({ showHistory: true })
    this.loadHistory()
  },

  // 关闭历史记录
  closeHistory() {
    this.setData({ showHistory: false })
  },

  // 加载历史菜单
  loadHistory() {
    const coupleId = this.data.coupleId
    if (!coupleId) return
    wx.cloud.database().collection('tonightMenus')
      .where({ coupleId, status: 'deleted' })
      .orderBy('createTime', 'desc')
      .limit(30)
      .get()
      .then(res => {
        const historyList = (res.data || []).map(menu => ({
          _id: menu._id,
          dateText: this.formatDate(menu.date || menu.createTime),
          dishCount: (menu.dishes || []).length
        }))
        this.setData({ historyList })
      })
      .catch(err => {
        console.error('加载历史菜单失败:', err)
      })
  },

  // 查看某条历史菜单
  viewHistoryMenu(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/dish/tonight/tonight?id=${id}`
    })
    this.setData({ showHistory: false })
  },

  preventClose() {
    // 阻止点击弹窗内容时关闭
  },

  generateShoppingList() {
    const app = getApp()

    if (!this.data.menu || !this.data.menu._id) {
      wx.showToast({ title: '菜单数据未加载', icon: 'none' })
      return
    }

    if (!this.data.dishes || this.data.dishes.length === 0) {
      wx.showToast({ title: '菜单中没有菜', icon: 'none' })
      return
    }

    // 检查缓存
    if (this.data.menu.shoppingListId) {
      wx.navigateTo({
        url: `/pages/dish/shopping-list/shopping-list?id=${this.data.menu.shoppingListId}`
      })
      return
    }

    wx.showLoading({ title: 'AI 汇总中...' })

    wx.cloud.callFunction({
      name: 'generateShoppingList',
      data: {
        dishes: this.data.dishes.map(d => ({
          name: d.name,
          ingredients: d.ingredients || []
        }))
      }
    }).then(res => {
      wx.hideLoading()

      if (!res.result || !res.result.success) {
        const errMsg = (res.result && res.result.error) || '生成失败'
        wx.showModal({ title: '生成失败', content: errMsg, showCancel: false })
        return
      }

      const { items, condiments } = res.result.data
      const coupleId = wx.getStorageSync('coupleId')
      const db = wx.cloud.database()

      db.collection('shoppingLists').add({
        data: {
          coupleId: coupleId,
          menuId: this.data.menu._id,
          date: new Date(),
          dishes: this.data.dishes.map(d => d.name),
          items: items.map(i => ({ ...i, checked: false, checkedBy: null })),
          condiments: condiments.map(c => ({ ...c, checked: false, checkedBy: null })),
          isCurrent: true,
          createTime: new Date(),
          createdBy: app.globalData.userInfo?.openid || ''
        }
      }).then(addRes => {
        if (!addRes || !addRes._id) {
          wx.showToast({ title: '保存失败', icon: 'none' })
          return
        }

        // 缓存 shoppingListId（失败不影响跳转）
        wx.cloud.callFunction({
          name: 'updateMenuField',
          data: {
            menuId: this.data.menu._id,
            field: 'shoppingListId',
            value: addRes._id
          }
        }).then(res => {
          if (res.result.success) {
            this.setData({ 'menu.shoppingListId': addRes._id })
          }
        }).catch(err => console.error('缓存失败', err))

        wx.navigateTo({
          url: `/pages/dish/shopping-list/shopping-list?id=${addRes._id}`
        })
      }).catch(err => {
        console.error('保存购物清单失败', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('生成购物清单失败', err)
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    })
  },

  removeDishFromMenu(e) {
    const { isAuthorized, menu } = this.data
    if (!isAuthorized || !menu) {
      wx.showToast({ title: '无权限操作', icon: 'none' })
      return
    }
    const dishId = e.currentTarget.dataset.id
    const menuId = menu._id

    wx.showModal({
      title: '确认删除',
      content: '确定从今晚菜单中删除这道菜吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          // 从 dishes 数组中移除
          const newDishes = menu.dishes.filter(id => id !== dishId)

          wx.cloud.database().collection('tonightMenus').doc(menuId).update({
            data: {
              dishes: newDishes,
              shoppingListId: null   // 菜单变了，清除购物清单缓存
            }
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除' })
            this.loadTonightMenu(menuId)
          })
        }
      }
    })
  },

  startCooking() {
    if (!this.data.menu || !this.data.menu._id) {
      wx.showToast({ title: '菜单数据错误', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/dish/cooking/cooking?menuId=${this.data.menu._id}`
    })
  }
})
