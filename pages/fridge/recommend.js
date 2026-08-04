const app = getApp()

Page({
  data: {
    fridgeItems: [],
    recommendations: [],
    loading: true,
    existingDishes: []
  },

  // 防止并发重复保存
  savingSet: new Set(),

  onLoad(options) {
    const itemsStr = options.items
    if (!itemsStr) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    try {
      const items = JSON.parse(decodeURIComponent(itemsStr))
      this.setData({ fridgeItems: items })

      // 清理所有旧缓存
      const coupleId = wx.getStorageSync('coupleId')
      wx.removeStorageSync('fridge_recommend_' + coupleId)
      wx.removeStorageSync('fridge_recommend_v2_' + coupleId)

      const cacheKey = 'fridge_recommend_v3_' + coupleId
      const cached = wx.getStorageSync(cacheKey)
      const itemsHash = items.map(i => i.name + i.amount).join(',')

      if (cached && cached.itemsHash === itemsHash && cached.recommendations.length > 0) {
        this.setData({
          recommendations: cached.recommendations,
          existingDishes: cached.existingDishes || [],
          loading: false
        })
      } else {
        this.loadRecommendations(items)
      }
    } catch (e) {
      wx.showToast({ title: '数据解析失败', icon: 'none' })
    }
  },

  cacheRecommendations(recommendations, existingDishes) {
    const cacheKey = 'fridge_recommend_v3_' + wx.getStorageSync('coupleId')
    const itemsHash = this.data.fridgeItems.map(i => i.name + i.amount).join(',')
    wx.setStorageSync(cacheKey, {
      itemsHash,
      recommendations,
      existingDishes,
      timestamp: Date.now()
    })
  },

  loadRecommendations(fridgeItems) {
    const coupleId = wx.getStorageSync('coupleId')

    wx.cloud.database().collection('dishes')
      .where({ coupleId, status: 'active' })
      .get()
      .then(res => {
        const existingDishes = res.data || []
        this.setData({ existingDishes })

        const existingRecs = this.calculateMatchScores(existingDishes, fridgeItems)
          .filter(r => r.matchScore >= 2)
          .map(r => ({ ...r, source: 'existing' }))

        return this.getAIRecommendations(fridgeItems, existingDishes).then(aiRecs => {
          const all = [...existingRecs, ...aiRecs]
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5)

          this.setData({
            recommendations: all,
            loading: false
          })
          this.cacheRecommendations(all, existingDishes)
        })
      })
      .catch(err => {
        console.error('加载推荐失败', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  calculateMatchScores(dishes, fridgeItems) {
    const fridgeNames = fridgeItems.map(i => i.name.trim())

    return dishes.map(dish => {
      const dishIngredients = (dish.ingredients || []).map(ing => {
        const str = String(ing || '')
        const match = str.match(/^(.+?)[\s\d]/)
        return match ? match[1].trim() : str.trim()
      }).filter(Boolean)

      let matched = 0
      const missing = []

      dishIngredients.forEach(ing => {
        if (!ing) return
        const hasMatch = fridgeNames.some(fn => fn.includes(ing) || ing.includes(fn))
        if (hasMatch) matched++
        else missing.push(ing)
      })

      const total = dishIngredients.length || 1
      const ratio = matched / total

      let matchScore = 1
      if (ratio >= 0.9) matchScore = 5
      else if (ratio >= 0.7) matchScore = 4
      else if (ratio >= 0.5) matchScore = 3
      else if (ratio >= 0.3) matchScore = 2

      return {
        name: dish.name,
        ingredients: dish.ingredients || [],
        steps: (dish.steps || []).slice(0, 3),
        matchScore,
        missingIngredients: missing,
        source: 'existing',
        dishId: dish._id
      }
    })
  },

  getAIRecommendations(fridgeItems, existingDishes) {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'recommendFromFridge',
        data: { fridgeItems }
      }).then(res => {
        if (!res.result || !res.result.success) {
          resolve([])
          return
        }

        const existingNames = existingDishes.map(d => d.name)

        const recs = (res.result.recommendations || []).map(r => {
          const ingredients = (r.ingredients || []).map(ing => {
            if (typeof ing === 'string') return ing
            if (typeof ing === 'object' && ing !== null && ing.name) {
              return ing.name + (ing.amount ? ' ' + ing.amount : '')
            }
            return String(ing)
          }).filter(s => s && s.trim() && s !== 'undefined' && s !== 'null' && s !== '[object Object]')

          const missingIngredients = (r.missingIngredients || [])
            .map(s => String(s || '').trim())
            .filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null' && s !== '[object Object]')

          const isExisting = existingNames.some(en =>
            en === r.name || en.includes(r.name) || r.name.includes(en)
          )

          return {
            name: r.name,
            ingredients: ingredients,
            steps: (r.steps || []).slice(0, 3),
            matchScore: Math.min(5, Math.max(1, r.matchScore || 3)),
            missingIngredients: missingIngredients,
            source: isExisting ? 'existing' : 'new'
          }
        }).filter(r => !existingNames.includes(r.name))

        resolve(recs)
      }).catch(err => {
        console.error('AI推荐失败', err)
        resolve([])
      })
    })
  },

  addToMenu(e) {
    const index = e.currentTarget.dataset.index
    const rec = this.data.recommendations[index]

    if (this.savingSet.has(rec.name)) {
      wx.showToast({ title: '正在处理中...', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })

    if (rec.source === 'existing' && rec.dishId) {
      this.addExistingToMenu(rec.dishId)
    } else {
      this.savingSet.add(rec.name)
      this.saveNewDish(rec).then(dishId => {
        this.savingSet.delete(rec.name)
        if (dishId) {
          rec.source = 'existing'
          rec.dishId = dishId
          this.setData({ recommendations: this.data.recommendations })
          this.cacheRecommendations(this.data.recommendations, this.data.existingDishes)
          this.addExistingToMenu(dishId)
        } else {
          wx.hideLoading()
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }).catch(err => {
        this.savingSet.delete(rec.name)
        wx.hideLoading()
        console.error(err)
      })
    }
  },

  saveNewDish(rec) {
    if (rec.dishId) {
      return Promise.resolve(rec.dishId)
    }

    const coupleId = wx.getStorageSync('coupleId')
    const userInfo = wx.getStorageSync('userInfo')

    const ingredients = rec.ingredients.map(ing => {
      if (typeof ing === 'string') return ing
      if (typeof ing === 'object' && ing !== null && ing.name) {
        return ing.name + (ing.amount ? ' ' + ing.amount : '')
      }
      return String(ing)
    }).filter(s => s && s.trim() && s !== 'undefined' && s !== 'null' && s !== '[object Object]')

    return wx.cloud.database().collection('dishes').add({
      data: {
        name: rec.name,
        category: '家常菜',
        ingredients: ingredients,
        steps: rec.steps || [],
        tips: 'AI冰箱推荐生成',
        videoLinks: [],
        creatorOpenid: userInfo?.openid || '',
        coupleId: coupleId,
        createTime: new Date(),
        status: 'active'
      }
    }).then(res => {
      rec.dishId = res._id
      return res._id
    }).catch(err => {
      console.error('保存新菜失败', err)
      return null
    })
  },

  addExistingToMenu(dishId) {
    const coupleId = wx.getStorageSync('coupleId')

    // 关键修复：不用 isCurrent 字段，直接查该 couple 的最新菜单
    wx.cloud.database().collection('tonightMenus')
      .where({ coupleId })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const menu = res.data[0]
          const dishes = menu.dishes || []

          if (dishes.includes(dishId)) {
            wx.hideLoading()
            wx.showToast({ title: '这道菜已在菜单中', icon: 'none' })
            return
          }

          dishes.push(dishId)
          return wx.cloud.database().collection('tonightMenus')
            .doc(menu._id)
            .update({
              data: { dishes, updateTime: new Date() }
            })
        } else {
          return wx.cloud.database().collection('tonightMenus').add({
            data: {
              coupleId,
              date: new Date(),
              dishes: [dishId],
              comments: [],
              createTime: new Date()
            }
          })
        }
      })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已加入今晚菜单', icon: 'success' })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加入菜单失败', err)
        wx.showToast({ title: '添加失败', icon: 'none' })
      })
  },

  saveToLibrary(e) {
    const index = e.currentTarget.dataset.index
    const rec = this.data.recommendations[index]

    if (this.savingSet.has(rec.name)) {
      wx.showToast({ title: '正在处理中...', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    this.savingSet.add(rec.name)

    this.saveNewDish(rec).then(dishId => {
      this.savingSet.delete(rec.name)
      wx.hideLoading()
      if (dishId) {
        // 更新状态：从 AI新菜 → 菜品库中
        rec.source = 'existing'
        rec.dishId = dishId
        this.setData({ recommendations: this.data.recommendations })
        this.cacheRecommendations(this.data.recommendations, this.data.existingDishes)
        wx.showToast({ title: '已保存到菜品库', icon: 'success' })
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }).catch(err => {
      this.savingSet.delete(rec.name)
      wx.hideLoading()
      console.error(err)
    })
  }
})
