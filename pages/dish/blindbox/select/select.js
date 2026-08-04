const PLACEHOLDERS = [
  '想要下饭一点的菜',
  '今天想吃点清淡的',
  '想学一道新菜',
  '想吃点辣的过瘾',
  '想给对象露一手',
  '冰箱有肉不知道怎么做好吃'
]

Page({
  data: {
    preferences: {
      taste: '',
      time: '',
      meat: '',
      cuisine: ''
    },
    freeText: '',
    randomPlaceholder: '',
    tasteOptions: ['不限', '清淡', '微辣', '中辣', '酸甜', '咸鲜'],
    timeOptions: ['不限', '快手菜', '普通', '慢炖'],
    meatOptions: ['不限', '猪肉', '牛肉', '鸡肉', '海鲜', '素菜'],
    cuisineOptions: ['不限', '家常菜', '川菜', '粤菜', '湘菜', '鲁菜', '东南亚']
  },

  onLoad() {
    this.setRandomPlaceholder()
  },

  setRandomPlaceholder() {
    const idx = Math.floor(Math.random() * PLACEHOLDERS.length)
    this.setData({ randomPlaceholder: PLACEHOLDERS[idx] })
  },

  toggleChip(e) {
    const { type, value } = e.currentTarget.dataset
    const preferences = { ...this.data.preferences }

    // 单选逻辑：选同一个则取消，选不同则切换
    if (preferences[type] === value) {
      preferences[type] = ''
    } else {
      preferences[type] = value
    }

    this.setData({ preferences })
  },

  onTextInput(e) {
    this.setData({ freeText: e.detail.value })
  },

  generateCandidates() {
    wx.showLoading({ title: 'AI 推荐中...' })

    // 获取已有菜名（用于 AI 去重）
    const coupleId = wx.getStorageSync('coupleId')
    wx.cloud.database().collection('dishes')
      .where({ coupleId, status: 'active' })
      .field({ name: true })
      .get()
      .then(res => {
        const existingDishes = res.data.map(d => d.name)

        return wx.cloud.callFunction({
          name: 'generateBlindboxCandidates',
          data: {
            preferences: this.data.preferences,
            freeText: this.data.freeText,
            existingDishes
          }
        })
      })
      .then(res => {
        wx.hideLoading()

        if (!res.result || !res.result.success) {
          wx.showModal({
            title: '生成失败',
            content: res.result?.error || '请重试',
            showCancel: false
          })
          return
        }

        const candidates = res.result.candidates || []
        if (candidates.length === 0) {
          wx.showToast({ title: '未生成候选菜', icon: 'none' })
          return
        }

        // 如果是 fallback 推荐，给用户一个轻提示
        if (res.result.fromFallback) {
          wx.showToast({
            title: 'AI服务繁忙，使用本地推荐',
            icon: 'none',
            duration: 2500
          })
        }

        // 跳转到候选展示页
        wx.navigateTo({
          url: `/pages/dish/blindbox/candidates/candidates?data=${encodeURIComponent(JSON.stringify(candidates))}`
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error(err)
        wx.showToast({ title: '请求失败', icon: 'none' })
      })
  }
})
