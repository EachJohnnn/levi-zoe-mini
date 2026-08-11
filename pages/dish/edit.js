const app = getApp()

Page({
  data: {
    dish: {
      name: '',
      category: '',
      ingredients: [],
      steps: [],
      tips: '',
      videoLinks: []
    },
    ingredientsText: '',
    stepsText: '',
    videoLinksText: '',
    isEdit: false,   // 是否是编辑模式
    dishId: ''       // 编辑时的 _id
  },

  onLoad() {
    const generated = app.globalData.generatedDish
    if (!generated) {
      wx.showToast({ title: '没有菜谱数据', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const isEdit = !!generated._id
    const currentCoupleId = wx.getStorageSync('coupleId')

    // 编辑模式下校验菜品归属
    if (isEdit && generated.coupleId && generated.coupleId !== currentCoupleId) {
      wx.showToast({ title: '无权限编辑该菜品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({
      dish: {
        name: generated.name || '',
        category: generated.category || '',
        ingredients: generated.ingredients || [],
        steps: generated.steps || [],
        tips: generated.tips || '',
        videoLinks: generated.videoLinks || []
      },
      ingredientsText: (generated.ingredients || []).join('\n'),
      stepsText: (generated.steps || []).join('\n'),
      videoLinksText: (generated.videoLinks || []).join('\n'),
      isEdit: isEdit,
      dishId: generated._id || ''
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`dish.${field}`]: e.detail.value
    })
  },

  onIngredientsInput(e) {
    this.setData({ ingredientsText: e.detail.value })
  },

  onStepsInput(e) {
    this.setData({ stepsText: e.detail.value })
  },

  onVideoLinksInput(e) {
    this.setData({ videoLinksText: e.detail.value })
  },

  saveDish() {
    const { dish, ingredientsText, stepsText, videoLinksText, isEdit, dishId } = this.data

    // 转回数组
    dish.ingredients = ingredientsText.split('\n').map(s => s.trim()).filter(Boolean)
    dish.steps = stepsText.split('\n').map(s => s.trim()).filter(Boolean)
    dish.videoLinks = videoLinksText.split('\n').map(s => s.trim()).filter(Boolean)

    if (!dish.name) {
      wx.showToast({ title: '菜名不能为空', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    const userInfo = wx.getStorageSync('userInfo')
    const coupleId = wx.getStorageSync('coupleId')

    // 只保留业务字段，过滤系统字段
    const saveData = {
      name: dish.name,
      category: dish.category,
      ingredients: dish.ingredients,
      steps: dish.steps,
      tips: dish.tips,
      videoLinks: dish.videoLinks,
      creatorOpenid: userInfo.openid,
      coupleId: coupleId,
      status: 'active'
    }

    if (isEdit) {
      // ========== 更新已有菜品（走云函数，避免客户端权限问题） ==========
      console.log('【菜品编辑】准备更新，dishId:', dishId, 'saveData:', saveData)
      wx.cloud.callFunction({
        name: 'updateDish',
        data: {
          dishId,
          name: saveData.name,
          category: saveData.category,
          ingredients: saveData.ingredients,
          steps: saveData.steps,
          tips: saveData.tips,
          videoLinks: saveData.videoLinks
        }
      }).then((res) => {
        console.log('【菜品编辑】云函数返回:', res.result)
        wx.hideLoading()
        if (!res.result.success) {
          wx.showToast({ title: res.result.error || '更新失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '更新成功', icon: 'success' })
        app.globalData.generatedDish = null
        setTimeout(() => {
          // 返回两层（详情页 → 列表页）
          wx.navigateBack({ delta: 2 })
        }, 1500)
      }).catch(err => {
        wx.hideLoading()
        console.error(err)
        wx.showToast({ title: '更新失败', icon: 'none' })
      })
    } else {
      // ========== 新建菜品 ==========
      wx.cloud.database().collection('dishes').add({
        data: {
          ...saveData,
          createTime: new Date()
        }
      }).then(res => {
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        app.globalData.generatedDish = null
        setTimeout(() => {
          // 新菜品保存后直接跳转到菜品库
          wx.redirectTo({ url: '/pages/dish/list/list' })
        }, 1500)
      }).catch(err => {
        wx.hideLoading()
        console.error(err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
    }
  },

  cancel() {
    app.globalData.generatedDish = null
    wx.navigateBack()
  }
})