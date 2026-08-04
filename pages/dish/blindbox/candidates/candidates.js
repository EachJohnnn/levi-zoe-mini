Page({
  data: {
    candidates: [],
    selectedCount: 0
  },

  onLoad(options) {
    const dataStr = options.data
    if (!dataStr) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    try {
      const candidates = JSON.parse(decodeURIComponent(dataStr))
      this.setData({
        candidates: candidates.map(c => ({ ...c, selected: false }))
      })
    } catch (e) {
      wx.showToast({ title: '数据解析失败', icon: 'none' })
    }
  },

  toggleSelect(e) {
    const index = e.currentTarget.dataset.index
    const candidates = [...this.data.candidates]

    if (!candidates[index].selected && this.data.selectedCount >= 3) {
      wx.showToast({ title: '最多选 3 道', icon: 'none' })
      return
    }

    candidates[index].selected = !candidates[index].selected
    const selectedCount = candidates.filter(c => c.selected).length

    this.setData({ candidates, selectedCount })
  },

  generateDishes() {
    const selected = this.data.candidates.filter(c => c.selected)
    if (selected.length === 0) {
      wx.showToast({ title: '请至少选一道', icon: 'none' })
      return
    }

    const dishNames = selected.map(c => c.name)

    wx.showLoading({ title: 'AI 生成菜谱中...' })

    wx.cloud.callFunction({
      name: 'generateBlindboxDishes',
      data: { dishNames }
    }).then(res => {
      wx.hideLoading()

      if (!res.result || !res.result.success) {
        wx.showModal({
          title: '生成失败',
          content: res.result?.error || '请重试',
          showCancel: false
        })
        return
      }

      const dishes = res.result.dishes || []
      if (dishes.length === 0) {
        wx.showToast({ title: '未生成菜谱', icon: 'none' })
        return
      }

      wx.navigateTo({
        url: `/pages/dish/blindbox/preview/preview?data=${encodeURIComponent(JSON.stringify(dishes))}`
      })
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '请求失败', icon: 'none' })
    })
  }
})
