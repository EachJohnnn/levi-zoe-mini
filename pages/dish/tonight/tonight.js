const app = getApp()

Page({
  data: {
    menu: null,
    dishes: [],
    loading: true,
    formattedDate: ''
  },

  onLoad(options) {
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
    this.setData({ loading: true })
    wx.cloud.database().collection('tonightMenus').doc(id).get()
      .then(res => {
        this.setData({
          menu: res.data,
          formattedDate: this.formatDate(res.data.date),
          loading: false
        })
        this.loadDishes(res.data.dishes)
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadLatestMenu() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      this.setData({ loading: false })
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.cloud.database().collection('tonightMenus')
      .where({ coupleId: coupleId })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          this.setData({
            menu: res.data[0],
            formattedDate: this.formatDate(res.data[0].date),
            loading: false
          })
          this.loadDishes(res.data[0].dishes)
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '还没有今晚菜单', icon: 'none' })
        }
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
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

  addComment(e) {
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
    const dishId = e.currentTarget.dataset.id
    const menuId = this.data.menu._id
  
    wx.showModal({
      title: '确认删除',
      content: '确定从今晚菜单中删除这道菜吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
  
          // 从 dishes 数组中移除
          const newDishes = this.data.menu.dishes.filter(id => id !== dishId)
  
          wx.cloud.database().collection('tonightMenus').doc(menuId).update({
            data: {
              dishes: newDishes,
              shoppingListId: null   // 菜单变了，清除购物清单缓存
            }
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除' })
            this.loadTonightMenu(menuId)   // 注意：原可能写成 loadMenu，确保为 loadTonightMenu
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
  
    // 删除旧的 sop 缓存，强制重新生成（只执行一次，后续会缓存新格式）
    wx.cloud.callFunction({
      name: 'updateMenuField',
      data: { menuId: this.data.menu._id, field: 'sop', value: null }
    }).then(() => {
      wx.navigateTo({
        url: `/pages/dish/cooking/cooking?menuId=${this.data.menu._id}`
      })
    }).catch(() => {
      // 即使删除失败也跳转（可能是权限问题或字段不存在）
      wx.navigateTo({
        url: `/pages/dish/cooking/cooking?menuId=${this.data.menu._id}`
      })
    })
  }
})