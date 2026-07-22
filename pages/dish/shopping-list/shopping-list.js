const app = getApp()

Page({
  data: {
    listId: '',
    coupleId: '',
    date: '',
    dishes: [],
    items: [],
    condiments: []
  },

  onLoad(options) {
    const listId = options.id
    if (!listId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({ listId, coupleId: wx.getStorageSync('coupleId') })
    this.loadList(listId)
    this.startWatcher(listId)
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close()
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
    }
  },

  loadList(id) {
    wx.cloud.database().collection('shoppingLists').doc(id).get()
      .then(res => {
        const data = res.data
        this.setData({
          date: this.formatDate(data.date),
          dishes: data.dishes || [],
          items: data.items || [],
          condiments: data.condiments || []
        })
      })
      .catch(err => {
        console.error(err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 实时监听勾选状态
  // 实时监听勾选状态（开发者工具不支持 watch，降级为轮询）
  startWatcher(id) {
    // 真机环境用 watch
    const platform = wx.getSystemInfoSync().platform
    if (platform !== 'devtools') {
      this.watcher = wx.cloud.database().collection('shoppingLists')
        .doc(id)
        .watch({
          onChange: snapshot => {
            if (snapshot.docChanges.length > 0) {
              const data = snapshot.docChanges[0].doc
              this.setData({
                items: data.items || [],
                condiments: data.condiments || []
              })
            }
          },
          onError: err => console.error('监听失败', err)
        })
    } else {
      // 开发者工具降级为 3 秒轮询
      this.pollTimer = setInterval(() => {
        this.loadList(id)
      }, 3000)
    }
  },

  toggleItem(e) {
    const { index, type } = e.currentTarget.dataset
    const field = type === 'item' ? 'items' : 'condiments'
    const list = this.data[field]
    const item = list[index]

    // 切换状态
    const newList = [...list]
    newList[index] = {
      ...item,
      checked: !item.checked,
      checkedBy: !item.checked ? (app.globalData.userInfo?.nickName || '我') : null
    }

    // 乐观更新
    this.setData({ [field]: newList })

    // 同步到数据库
    wx.cloud.database().collection('shoppingLists').doc(this.data.listId).update({
      data: { [field]: newList }
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '同步失败', icon: 'none' })
    })
  },

  copyList() {
    const { items, condiments } = this.data
    let text = '🛒 购物清单\n\n【食材】\n'
    items.forEach(i => {
      text += `${i.checked ? '✓' : '☐'} ${i.name} ${i.amount}\n`
    })
    text += '\n【配料】\n'
    condiments.forEach(c => {
      text += `${c.checked ? '✓' : '☐'} ${c.name} ${c.amount}\n`
    })

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制到剪贴板' })
    })
  },

  goHistory() {
    wx.navigateTo({
      url: '/pages/dish/shopping-list/history/history'
    })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
})