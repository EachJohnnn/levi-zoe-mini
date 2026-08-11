const app = getApp()

Page({
  data: {
    allDishes: [],
    dishes: [],
    loading: true,
    searchKeyword: '',
    activeCategory: '全部',
    categories: ['全部'],
    sortBy: 'timeDesc',
    sortOptions: [
      { key: 'timeDesc', label: '最近添加' },
      { key: 'timeAsc', label: '最早添加' },
      { key: 'nameAsc', label: '名称 A-Z' },
      { key: 'nameDesc', label: '名称 Z-A' },
      { key: 'category', label: '按分类' }
    ],
    wantFilter: false,
    pageSize: 20
  },

  // 记录是否从详情页返回
  returning: false,
  lastScrollTop: 0,

  onShow() {
    this.loadDishes()
  },

  onPageScroll(e) {
    this.lastScrollTop = e.scrollTop
  },

  // 分批加载所有菜品，避免默认 20 条限制
  loadDishes() {
    const coupleId = wx.getStorageSync('coupleId')
    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })
    this.fetchAllDishes(coupleId)
  },

  fetchAllDishes(coupleId, start = 0, accumulated = []) {
    wx.cloud.database().collection('dishes')
      .where({
        coupleId: coupleId,
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .skip(start)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const data = res.data || []
        const all = accumulated.concat(data)
        if (data.length === this.data.pageSize) {
          // 可能还有下一批
          this.fetchAllDishes(coupleId, start + this.data.pageSize, all)
        } else {
          this.processLoadedDishes(all)
        }
      })
      .catch(err => {
        console.error('【列表】查询失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  processLoadedDishes(allDishes) {
    // 收集分类
    const categorySet = new Set()
    allDishes.forEach(d => {
      if (d.category && d.category.trim()) {
        categorySet.add(d.category.trim())
      }
    })

    this.setData({
      allDishes,
      categories: ['全部', ...Array.from(categorySet)],
      loading: false
    }, () => {
      this.applyFilter()
    })
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
    this.applyFilter()
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.applyFilter()
  },

  // 切换排序
  selectSort(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy })
    this.applyFilter()
  },

  // 切换通缉榜筛选
  toggleWantFilter() {
    this.setData({ wantFilter: !this.data.wantFilter })
    this.applyFilter()
  },

  // 应用筛选+排序
  applyFilter() {
    const { allDishes, searchKeyword, activeCategory, sortBy, wantFilter } = this.data

    let result = allDishes.slice()

    // 分类筛选
    if (activeCategory && activeCategory !== '全部') {
      result = result.filter(d => d.category === activeCategory)
    }

    // 通缉榜筛选
    if (wantFilter) {
      result = result.filter(d => d.inWantPool)
    }

    // 搜索
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      result = result.filter(d =>
        (d.name && d.name.toLowerCase().includes(kw)) ||
        (d.category && d.category.toLowerCase().includes(kw))
      )
    }

    // 排序
    switch (sortBy) {
      case 'timeDesc':
        result.sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0))
        break
      case 'timeAsc':
        result.sort((a, b) => new Date(a.createTime || 0) - new Date(b.createTime || 0))
        break
      case 'nameAsc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'))
        break
      case 'nameDesc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'zh-CN'))
        break
      case 'category':
        result.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'zh-CN'))
        break
    }

    this.setData({ dishes: result }, () => {
      const app = getApp()
      if (app.globalData.returnToDishList) {
        app.globalData.returnToDishList = false
        const scrollTop = app.globalData.dishListScrollTop || 0
        if (scrollTop > 0) {
          setTimeout(() => {
            wx.pageScrollTo({ scrollTop, duration: 0 })
          }, 50)
        }
      }
    })
  },

  // 添加新菜
  goAddDish() {
    wx.showModal({
      title: '添加新菜品',
      placeholderText: '请输入菜名（如：番茄炒蛋）',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const dishName = res.content.trim()
          if (!dishName) return

          // 把菜名存起来，跳转到编辑页之前先生成
          wx.showLoading({ title: 'AI正在生成菜谱...' })

          wx.cloud.callFunction({
            name: 'generateDish',
            data: { dishName }
          }).then(cloudRes => {
            wx.hideLoading()
            if (cloudRes.result.success) {
              getApp().globalData.generatedDish = cloudRes.result.dishData
              wx.navigateTo({
                url: '/pages/dish/edit'
              })
            } else {
              wx.showToast({ title: '生成失败', icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
            wx.showToast({ title: '生成失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 点击菜品
  onDishTap(e) {
    const id = e.currentTarget.dataset.id
    const app = getApp()
    app.globalData.returnToDishList = true
    app.globalData.dishListScrollTop = this.lastScrollTop
    wx.navigateTo({
      url: `/pages/dish/detail/detail?id=${id}`
    })
  },

  // 加入美食通缉榜
  addToWantList(e) {
    const id = e.currentTarget.dataset.id
    const userInfo = wx.getStorageSync('userInfo')
    if (!id) {
      wx.showToast({ title: '菜品ID错误', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加入中...' })

    wx.cloud.callFunction({
      name: 'toggleDishWant',
      data: {
        dishId: id,
        inWantPool: true,
        nickName: userInfo?.nickName || '',
        avatarUrl: userInfo?.avatarUrl || ''
      }
    }).then(res => {
      wx.hideLoading()

      if (!res.result || !res.result.success) {
        const errorMsg = (res.result && res.result.error) || '加入失败'
        wx.showToast({ title: errorMsg, icon: 'none' })
        return
      }

      wx.showToast({ title: '已加入美食通缉榜', icon: 'success' })

      // 更新本地菜品状态，切换 UI
      const updateDish = (list) => list.map(dish => {
        if (dish._id === id) {
          return { ...dish, inWantPool: true }
        }
        return dish
      })
      this.setData({
        allDishes: updateDish(this.data.allDishes),
        dishes: updateDish(this.data.dishes)
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('加入美食通缉榜失败', err)
      wx.showToast({ title: err.message || '加入失败，请重试', icon: 'none' })
    })
  }
})
