const app = getApp()

Page({
  data: {
    restaurantId: '',
    restaurantName: '',
    form: {
      visitDate: '',
      totalPrice: '',
      rating: 0,
      dishesText: '',
      note: ''
    },
    saving: false
  },

  onLoad(options) {
    // 设置默认日期为今天
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    this.setData({
      restaurantId: options.restaurantId || '',
      restaurantName: options.name ? decodeURIComponent(options.name) : '餐厅',
      'form.visitDate': dateStr
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ 'form.visitDate': e.detail.value })
  },

  // 消费输入
  onPriceInput(e) {
    this.setData({ 'form.totalPrice': e.detail.value })
  },

  // 评分
  setRating(e) {
    this.setData({ 'form.rating': e.currentTarget.dataset.rating })
  },

  // 菜品输入
  onDishesInput(e) {
    this.setData({ 'form.dishesText': e.detail.value })
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value })
  },

  // 提交打卡
  submitVisit() {
    const { restaurantId, restaurantName, form } = this.data
    const coupleId = wx.getStorageSync('coupleId')
    const userInfo = wx.getStorageSync('userInfo')

    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      return
    }

    if (!form.visitDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    const db = wx.cloud.database()

    // 解析菜品
    const dishes = form.dishesText
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const visitData = {
      restaurantId,
      restaurantName,
      visitDate: form.visitDate,
      totalPrice: form.totalPrice ? parseFloat(form.totalPrice) : null,
      rating: form.rating,
      dishes,
      note: form.note.trim(),
      coupleId,
      creatorOpenid: userInfo?.openid || '',
      createTime: new Date()
    }

    db.collection('restaurantVisits').add({ data: visitData })
      .then(() => {
        // 更新餐厅的 visited 和 visitCount
        return db.collection('restaurants').doc(restaurantId).update({
          data: {
            visited: true,
            visitCount: db.command.inc(1)
          }
        })
      })
      .then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '打卡成功！', icon: 'success' })
        setTimeout(() => {
          // 返回详情页并刷新
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.loadVisits) {
            prevPage.loadVisits(restaurantId)
            prevPage.loadRestaurant(restaurantId)
          }
          wx.navigateBack()
        }, 800)
      })
      .catch(err => {
        console.error('打卡失败:', err)
        this.setData({ saving: false })
        wx.showToast({ title: '打卡失败', icon: 'none' })
      })
  }
})
