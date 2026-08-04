const app = getApp()

const CUISINE_OPTIONS = ['火锅', '烧烤', '日料', '韩餐', '西餐', '川菜', '粤菜', '湘菜', '江浙菜', '东南亚', '小吃', '甜品', '其他']

Page({
  data: {
    isEdit: false,
    restaurantId: '',
    form: {
      name: '',
      address: '',
      phone: '',
      pricePerPerson: '',
      cuisineTags: [],
      rating: 0,
      note: '',
      wantToGo: false,
      latitude: null,
      longitude: null
    },
    cuisineOptions: CUISINE_OPTIONS,
    saving: false,
    selectedTagMap: {},
    showManual: false,
    // 搜索相关
    searchKeyword: '',
    searchResults: [],
    searching: false,
    showSearchResults: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, restaurantId: options.id })
      this.loadRestaurant(options.id)
    }
  },

  loadRestaurant(id) {
    wx.cloud.database().collection('restaurants').doc(id).get()
      .then(res => {
        const data = res.data
        const cuisineTags = data.cuisineTags || []
        const selectedTagMap = {}
        cuisineTags.forEach(t => { selectedTagMap[t] = true })
        this.setData({
          form: {
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            pricePerPerson: data.pricePerPerson ? String(data.pricePerPerson) : '',
            cuisineTags: cuisineTags,
            rating: data.rating || 0,
            note: data.note || '',
            wantToGo: data.wantToGo || false,
            latitude: data.latitude || null,
            longitude: data.longitude || null
          },
          selectedTagMap
        })
      })
      .catch(err => {
        console.error('加载餐厅失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 输入处理
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },
  onAddressInput(e) {
    this.setData({ 'form.address': e.detail.value })
  },
  onPhoneInput(e) {
    this.setData({ 'form.phone': e.detail.value })
  },
  onPriceInput(e) {
    this.setData({ 'form.pricePerPerson': e.detail.value })
  },
  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value })
  },

  // ========== 搜索商家 ==========
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })

    // 输入2个字以上才开始搜索
    if (keyword.trim().length >= 2) {
      this.doSearch(keyword.trim())
    } else {
      this.setData({ showSearchResults: false, searchResults: [] })
    }
  },

  doSearch(keyword) {
    this.setData({ searching: true })

    // 获取用户位置后搜索（按距离排序）
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        wx.cloud.callFunction({
          name: 'searchRestaurants',
          data: {
            keyword,
            type: 'suggestion',
            lat: loc.latitude,
            lng: loc.longitude
          }
        }).then(res => {
          this.setData({ searching: false })
          if (res.result.success) {
            this.setData({
              searchResults: res.result.data || [],
              showSearchResults: true
            })
          }
        }).catch(err => {
          console.error('搜索失败:', err)
          this.setData({ searching: false })
        })
      },
      fail: () => {
        // 无法获取位置，直接搜索（不按距离排序）
        wx.cloud.callFunction({
          name: 'searchRestaurants',
          data: { keyword, type: 'suggestion' }
        }).then(res => {
          this.setData({ searching: false })
          if (res.result.success) {
            this.setData({
              searchResults: res.result.data || [],
              showSearchResults: true
            })
          }
        }).catch(err => {
          console.error('搜索失败:', err)
          this.setData({ searching: false })
        })
      }
    })
  },

  // 选择搜索结果
  selectResult(e) {
    const result = e.currentTarget.dataset.item
    if (!result) return

    // 解析地址、经纬度和电话
    const address = result.address || ''
    const title = result.title || ''
    const lat = result.location?.lat
    const lng = result.location?.lng
    const phone = result.tel || ''

    const updateData = {
      form: {
        ...this.data.form,
        name: title,
        address: address
      },
      searchKeyword: title,
      showSearchResults: false,
      searchResults: []
    }

    // 如果有经纬度，一并保存
    if (lat && lng) {
      updateData.form.latitude = lat
      updateData.form.longitude = lng
    }

    // 如果有电话，一并保存
    if (phone) {
      updateData.form.phone = phone
    }

    this.setData(updateData)
  },

  // 隐藏搜索结果
  hideSearchResults() {
    this.setData({ showSearchResults: false })
  },

  // ========== 从地图选择 ==========
  chooseFromMap() {
    const that = this
    wx.chooseLocation({
      success(res) {
        console.log('选择位置:', res)
        that.setData({
          form: {
            ...that.data.form,
            name: res.name || that.data.form.name,
            address: res.address || '',
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
        wx.showToast({ title: '已选择位置', icon: 'success' })
      },
      fail(err) {
        console.log('取消选择:', err)
      }
    })
  },

  // 切换手动填写
  toggleManual() {
    this.setData({ showManual: !this.data.showManual })
  },

  // 选择/取消菜系标签
  toggleCuisine(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = [...this.data.form.cuisineTags]
    const idx = tags.indexOf(tag)
    if (idx > -1) {
      tags.splice(idx, 1)
    } else {
      tags.push(tag)
    }
    // 重建选中状态映射
    const selectedTagMap = {}
    tags.forEach(t => { selectedTagMap[t] = true })
    this.setData({
      form: { ...this.data.form, cuisineTags: tags },
      selectedTagMap
    })
  },

  // 选择评分
  setRating(e) {
    const rating = e.currentTarget.dataset.rating
    this.setData({
      form: { ...this.data.form, rating }
    })
  },

  // 切换想去
  toggleWantToGo(e) {
    this.setData({ 'form.wantToGo': e.detail.value })
  },

  // 保存
  saveRestaurant() {
    const { form, isEdit, restaurantId } = this.data
    const coupleId = wx.getStorageSync('coupleId')
    const userInfo = wx.getStorageSync('userInfo')

    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
      return
    }

    // 校验
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    const db = wx.cloud.database()
    const data = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      pricePerPerson: form.pricePerPerson ? parseInt(form.pricePerPerson) : null,
      cuisineTags: form.cuisineTags,
      rating: form.rating,
      note: form.note.trim(),
      wantToGo: form.wantToGo,
      visited: isEdit ? undefined : false,
      status: 'active'
    }

    // 如果有经纬度，一起保存
    if (form.latitude && form.longitude) {
      data.latitude = form.latitude
      data.longitude = form.longitude
    }

    if (isEdit) {
      // 更新
      db.collection('restaurants').doc(restaurantId).update({
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          pricePerPerson: data.pricePerPerson,
          cuisineTags: data.cuisineTags,
          rating: data.rating,
          note: data.note,
          wantToGo: data.wantToGo,
          ...(data.latitude && data.longitude ? {
            latitude: data.latitude,
            longitude: data.longitude
          } : {})
        }
      }).then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '更新成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      }).catch(err => {
        console.error('更新失败:', err)
        this.setData({ saving: false })
        wx.showToast({ title: '更新失败', icon: 'none' })
      })
    } else {
      // 新增
      db.collection('restaurants').add({
        data: {
          ...data,
          coupleId,
          creatorOpenid: userInfo?.openid || '',
          createTime: new Date()
        }
      }).then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '添加成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      }).catch(err => {
        console.error('添加失败:', err)
        this.setData({ saving: false })
        wx.showToast({ title: '添加失败', icon: 'none' })
      })
    }
  }
})
