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
      // ========== 更新已有菜品 ==========
      wx.cloud.database().collection('dishes').doc(dishId).update({
        data: {
          ...saveData,
          updateTime: new Date()
        }
      }).then(() => {
        wx.hideLoading()
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
          wx.navigateBack()
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