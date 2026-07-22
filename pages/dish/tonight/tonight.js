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
    // 检查菜单数据是否加载完成
    if (!this.data.menu || !this.data.menu._id) {
      wx.showToast({ title: '菜单数据未加载', icon: 'none' })
      return
    }

    if (!this.data.dishes || this.data.dishes.length === 0) {
      wx.showToast({ title: '菜单中没有菜', icon: 'none' })
      return
    }

    wx.showLoading({ title: 'AI 汇总中...' })

    // 1. 调用云函数生成购物清单
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
        console.error('购物清单生成失败:', errMsg)
        wx.showModal({
          title: '生成失败',
          content: errMsg,
          showCancel: false
        })
        return
      }

      const { items, condiments } = res.result.data

      // 2. 将旧的当前清单标记为 isCurrent: false
      const coupleId = wx.getStorageSync('coupleId')
      wx.cloud.database().collection('shoppingLists')
        .where({ coupleId, isCurrent: true })
        .update({ data: { isCurrent: false } })

      // 3. 创建新的购物清单
      return wx.cloud.database().collection('shoppingLists').add({
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
      })

    }).then(res => {
      if (!res || !res._id) {
        wx.showToast({ title: '保存失败', icon: 'none' })
        return
      }
      // 4. 跳转到购物清单详情页
      wx.navigateTo({
        url: `/pages/dish/shopping-list/shopping-list?id=${res._id}`
      })
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '生成失败', icon: 'none' })
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
              dishes: newDishes
            }
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除' })
            this.loadTonightMenu(menuId) // 刷新
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
            wx.showToast({ title: '删除失败', icon: 'none' })
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