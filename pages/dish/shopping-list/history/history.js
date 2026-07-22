Page({
  data: {
    history: []
  },

  onShow() {
    this.loadHistory()
  },

  loadHistory() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      this.setData({ history: [] })
      return
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    wx.cloud.database().collection('shoppingLists')
      .where({
        coupleId: coupleId,
        createTime: wx.cloud.database().command.gte(sevenDaysAgo)
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 1. 找出每天 createTime 最晚的那条的 _id（正式清单）
        const lastOfDay = {}
        res.data.forEach(item => {
          const dateStr = this.formatDateKey(item.date)
          if (!lastOfDay[dateStr] || new Date(item.createTime) > new Date(lastOfDay[dateStr].time)) {
            lastOfDay[dateStr] = { id: item._id, time: item.createTime }
          }
        })

        // 2. 所有清单都展示，标记是否是当天最后一条
        const history = res.data.map(item => {
          const dateStr = this.formatDateKey(item.date)
          const isOfficial = lastOfDay[dateStr]?.id === item._id

          const totalCount = (item.items?.length || 0) + (item.condiments?.length || 0)
          const checkedCount = (item.items?.filter(i => i.checked).length || 0)
                         + (item.condiments?.filter(c => c.checked).length || 0)

          return {
            ...item,
            formattedDate: this.formatDate(item.date),
            formattedTime: this.formatTime(item.createTime),
            totalCount,
            checkedCount,
            progress: totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
            isOfficial  // 当天最后一条 = 正式购物清单
          }
        })

        this.setData({ history })
      })
      .catch(err => {
        console.error(err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/dish/shopping-list/shopping-list?id=${id}`
    })
  },

  restoreList(e) {
    const id = e.currentTarget.dataset.id
    const coupleId = wx.getStorageSync('coupleId')

    wx.showModal({
      title: '恢复清单',
      content: '确定将这份清单恢复为当前清单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '恢复中...' })

          wx.cloud.database().collection('shoppingLists')
            .where({ coupleId, isCurrent: true })
            .update({ data: { isCurrent: false } })
            .then(() => {
              return wx.cloud.database().collection('shoppingLists').doc(id).update({
                data: { isCurrent: true }
              })
            })
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已恢复', icon: 'success' })
              this.loadHistory()
            })
            .catch(err => {
              wx.hideLoading()
              console.error(err)
              wx.showToast({ title: '恢复失败', icon: 'none' })
            })
        }
      }
    })
  },

  deleteList(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这份历史清单吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          wx.cloud.database().collection('shoppingLists').doc(id).remove()
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除' })
              this.loadHistory()
            })
            .catch(err => {
              wx.hideLoading()
              console.error(err)
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  },

  formatDateKey(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
