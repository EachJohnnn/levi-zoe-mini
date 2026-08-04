const app = getApp()

Page({
  data: {
    items: [],
    inputText: '',
    showEditModal: false,
    editIndex: -1,
    editName: '',
    editAmount: '',
    coupleId: ''
  },

  onShow() {
    const coupleId = wx.getStorageSync('coupleId')
    this.setData({ coupleId })
    this.loadFridge()
  },

  // 加载冰箱数据
  loadFridge() {
    const coupleId = this.data.coupleId
    if (!coupleId) return

    wx.cloud.database().collection('fridges')
      .where({ coupleId })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          this.setData({ items: res.data[0].items || [] })
        }
      })
      .catch(err => console.error('加载冰箱失败', err))
  },

  // 保存冰箱数据
  saveFridge(items) {
    const coupleId = this.data.coupleId
    if (!coupleId) return

    wx.cloud.database().collection('fridges')
      .where({ coupleId })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          // 更新
          return wx.cloud.database().collection('fridges')
            .doc(res.data[0]._id)
            .update({ data: { items, updateTime: new Date() } })
        } else {
          // 新建
          return wx.cloud.database().collection('fridges').add({
            data: {
              coupleId,
              items,
              createTime: new Date(),
              updateTime: new Date()
            }
          })
        }
      })
      .catch(err => console.error('保存冰箱失败', err))
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  // 添加食材
  addItems() {
    const text = this.data.inputText.trim()
    if (!text) {
      wx.showToast({ title: '请输入食材', icon: 'none' })
      return
    }

    wx.showLoading({ title: 'AI识别中...' })

    wx.cloud.callFunction({
      name: 'parseFridgeItems',
      data: { text }
    }).then(res => {
      wx.hideLoading()

      if (!res.result || !res.result.success) {
        wx.showToast({ title: res.result?.error || '识别失败', icon: 'none' })
        return
      }

      const newItems = res.result.items || []
      if (newItems.length === 0) {
        wx.showToast({ title: '未识别到食材', icon: 'none' })
        return
      }

      // 合并现有食材（同名则更新数量）
      const items = [...this.data.items]
      newItems.forEach(newItem => {
        const idx = items.findIndex(i => i.name === newItem.name)
        if (idx >= 0) {
          items[idx] = newItem
        } else {
          items.push(newItem)
        }
      })

      this.setData({ items, inputText: '' })
      this.saveFridge(items)
      wx.showToast({ title: `添加${newItems.length}个食材`, icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '识别失败', icon: 'none' })
    })
  },

  // 删除单个食材
  deleteItem(e) {
    const index = e.currentTarget.dataset.index
    const items = this.data.items.filter((_, i) => i !== index)
    this.setData({ items })
    this.saveFridge(items)
    wx.showToast({ title: '已删除' })
  },

  // 清空所有
  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定清空冰箱所有食材吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ items: [] })
          this.saveFridge([])
          wx.showToast({ title: '已清空' })
        }
      }
    })
  },

  // 打开编辑弹窗
  editItem(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.items[index]
    this.setData({
      showEditModal: true,
      editIndex: index,
      editName: item.name,
      editAmount: item.amount
    })
  },

  closeModal() {
    this.setData({ showEditModal: false })
  },

  preventBubble() {},

  onEditName(e) {
    this.setData({ editName: e.detail.value })
  },

  onEditAmount(e) {
    this.setData({ editAmount: e.detail.value })
  },

  confirmEdit() {
    const { editIndex, editName, editAmount } = this.data
    if (!editName.trim()) {
      wx.showToast({ title: '名称不能为空', icon: 'none' })
      return
    }

    const items = [...this.data.items]
    items[editIndex] = { name: editName.trim(), amount: editAmount.trim() }
    this.setData({ items, showEditModal: false })
    this.saveFridge(items)
    wx.showToast({ title: '已保存' })
  },

  // 跳转推荐页
  goRecommend() {
    if (this.data.items.length === 0) {
      wx.showToast({ title: '冰箱为空', icon: 'none' })
      return
    }

    const itemsJson = JSON.stringify(this.data.items)
    wx.navigateTo({
      url: `/pages/fridge/recommend?items=${encodeURIComponent(itemsJson)}`
    })
  }
})
