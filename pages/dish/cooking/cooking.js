Page({
  data: {
    menu: null,
    dishes: [],
    sop: null,
    currentStage: 'prep',
    completedPrep: {},
    completedCook: {},
    prepProgress: 0,
    cookingProgress: 0,
    loading: true,
    errorMsg: ''            // 错误信息
  },

  onLoad(options) {
    const menuId = options.menuId
    if (!menuId) {
      this.setData({ loading: false, errorMsg: '参数错误' })
      return
    }
    this.loadMenu(menuId)
  },

  // 从其他页面返回时刷新
  onShow() {
    if (this.data.menu && this.data.menu._id) {
      this.loadMenu(this.data.menu._id)
    }
  },

  loadMenu(menuId) {
    const db = wx.cloud.database()
    db.collection('tonightMenus').doc(menuId).get()
      .then(res => {
        const menu = res.data
        this.setData({ menu })
  
        // 使用缓存的 sop（云函数已确保格式统一）
        if (menu.sop && Array.isArray(menu.sop.prep) && Array.isArray(menu.sop.cook) && menu.sop.cook.length > 0) {
          this.setData({ sop: menu.sop, loading: false })
          this.loadDishes(menu.dishes, false)
          return
        }
  
        // 没有缓存或无效，加载菜品后调 AI
        this.loadDishes(menu.dishes, true)
      })
      .catch(err => {
        console.error('加载菜单失败', err)
        this.setData({ loading: false, errorMsg: '加载菜单失败' })
      })
  },

  loadDishes(dishIds, needGenerate) {
    if (!dishIds || dishIds.length === 0) {
      this.setData({ loading: false, errorMsg: '菜单中没有菜品' })
      return
    }

    const db = wx.cloud.database()
    db.collection('dishes')
      .where({ _id: db.command.in(dishIds) })
      .get()
      .then(res => {
        const dishes = res.data
        this.setData({ dishes })

        if (!needGenerate || this.data.sop) {
          this.setData({ loading: false })
          return
        }

        this.generateSOP(dishes)
      })
      .catch(err => {
        console.error('加载菜品失败', err)
        this.setData({ loading: false, errorMsg: '加载菜品失败' })
      })
  },

  generateSOP(dishes) {
    this.setData({ loading: true, errorMsg: '' })
  
    wx.cloud.callFunction({
      name: 'generateCookingSOP',
      data: {
        dishes: dishes.map(d => ({
          name: d.name,
          ingredients: d.ingredients || [],
          steps: d.steps || []
        }))
      }
    }).then(res => {
      if (!res.result || !res.result.success) {
        const err = (res.result && res.result.error) || '生成失败'
        this.setData({ loading: false, errorMsg: err })
        return
      }
  
      const sop = res.result.sop
      console.log('云函数返回的 sop:', JSON.stringify(sop))
  
      // 云函数已经格式化好了，简单校验即可
      if (!sop || !Array.isArray(sop.prep) || !Array.isArray(sop.cook)) {
        this.setData({ loading: false, errorMsg: '数据格式异常' })
        return
      }
  
      this.setData({ sop, loading: false })
  
      // 缓存到数据库
      wx.cloud.callFunction({
        name: 'updateMenuField',
        data: { menuId: this.data.menu._id, field: 'sop', value: sop }
      }).catch(err => console.error('缓存 SOP 失败', err))
  
    }).catch(err => {
      this.setData({ loading: false, errorMsg: '网络请求失败: ' + err.message })
    })
  },

  switchTab(e) {
    this.setData({ currentStage: e.currentTarget.dataset.stage })
  },

  // 切换烹饪步骤完成状态
  toggleCookStep(e) {
    const { dish, index } = e.currentTarget.dataset
    const key = `completedCook.${dish}_${index}`
    const newVal = !this.data.completedCook[`${dish}_${index}`]
    this.setData({ [key]: newVal })
    this.calcCookProgress()
  },

  calcPrepProgress() {
    if (!this.data.sop || !this.data.sop.prep) return
    const total = this.data.sop.prep.length
    const done = Object.values(this.data.completedPrep).filter(v => v).length
    this.setData({ prepProgress: total > 0 ? Math.round((done / total) * 100) : 0 })
  },

  calcCookProgress() {
    if (!this.data.sop || !this.data.sop.cook) return
    let total = 0, done = 0
    this.data.sop.cook.forEach(item => {
      if (item.steps && Array.isArray(item.steps)) {
        total += item.steps.length
        item.steps.forEach((_, idx) => {
          if (this.data.completedCook[`${item.dish}_${idx}`]) done++
        })
      }
    })
    this.setData({ cookingProgress: total > 0 ? Math.round((done / total) * 100) : 0 })
  },

  // 重试方法
  retryLoad() {
    if (this.data.menu && this.data.menu._id) {
      this.setData({ errorMsg: '', loading: true })
      this.loadMenu(this.data.menu._id)
    }
  }
})