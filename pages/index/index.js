// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    coupleId: null,
    loading: true
  },

  onLoad() {
    this.checkLoginStatus()
  },

  // 检查登录状态（带自动补 openid 逻辑）
  checkLoginStatus() {
    try {
      // 已登录且已绑定情侣空间时直接进首页，避免重新编译后闪登录页
      if (wx.getStorageSync('userInfo') && wx.getStorageSync('coupleId')) {
        wx.switchTab({ url: '/pages/home/home' })
        return
      }

      let userInfo = wx.getStorageSync('userInfo')
      const cachedCoupleId = wx.getStorageSync('coupleId')

      if (userInfo) {
        const finishLogin = (openid, coupleId) => {
          userInfo.openid = openid
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo
          // 优先使用数据库查询结果；查询不到时保留本地缓存，避免每次重新编译都要重绑
          const trustedCoupleId = coupleId || cachedCoupleId || null
          wx.setStorageSync('coupleId', trustedCoupleId)
          app.globalData.coupleId = trustedCoupleId

          this.setData({
            userInfo,
            hasUserInfo: true,
            coupleId: trustedCoupleId,
            loading: false
          })

          if (trustedCoupleId) {
            wx.switchTab({ url: '/pages/home/home' })
          }
        }

        const fetchUserCoupleId = (openid) => {
          const db = wx.cloud.database()
          const _ = db.command
          // 以用户实际所属的情侣空间为准，兼容未设置 status 的历史记录
          db.collection('couples').where({
            members: openid,
            status: _.neq('deleted')
          }).limit(1).get()
            .then(res => {
              const trustedCoupleId = res.data.length > 0 ? res.data[0]._id : null
              finishLogin(openid, trustedCoupleId)
            })
            .catch(err => {
              console.error('查询情侣空间失败:', err)
              finishLogin(openid, cachedCoupleId || null)
            })
        }

        if (!userInfo.openid) {
          wx.showLoading({ title: '正在获取 openid...' })
          wx.cloud.callFunction({
            name: 'login',
            success: (cloudRes) => {
              wx.hideLoading()
              fetchUserCoupleId(cloudRes.result.openid)
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('❌ 获取 openid 失败', err)
              this.setData({
                userInfo,
                hasUserInfo: true,
                coupleId: cachedCoupleId || null,
                loading: false
              })
              wx.showToast({ title: '获取 openid 失败', icon: 'none' })
            }
          })
        } else {
          fetchUserCoupleId(userInfo.openid)
        }
      } else {
        this.setData({ loading: false })
      }
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  onGetUserInfo() {
    const that = this
    wx.showLoading({ title: '登录中...' })
  
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success(profileRes) {
        const userInfo = profileRes.userInfo
  
        wx.cloud.callFunction({
          name: 'login',
          success(cloudRes) {
            const openid = cloudRes.result.openid
            userInfo.openid = openid
  
            // 1. 保存到本地
            wx.setStorageSync('userInfo', userInfo)
            app.globalData.userInfo = userInfo
  
            // 2. 写入云数据库 users 集合（关键！）
            const db = wx.cloud.database()
            db.collection('users').where({
              openid: openid
            }).get().then(res => {
              if (res.data.length === 0) {
                // 新用户，创建记录
                db.collection('users').add({
                  data: {
                    openid: openid,
                    nickName: userInfo.nickName,
                    avatarUrl: userInfo.avatarUrl,
                    createTime: new Date(),
                    coupleId: null
                  }
                })
              } else {
                // 已存在，更新昵称头像
                db.collection('users').doc(res.data[0]._id).update({
                  data: {
                    nickName: userInfo.nickName,
                    avatarUrl: userInfo.avatarUrl
                  }
                })
              }
            })
  
            that.setData({
              userInfo,
              hasUserInfo: true
            })

            wx.hideLoading()

            // 检查是否已有 coupleId
            const existingCoupleId = wx.getStorageSync('coupleId')
            if (existingCoupleId) {
              wx.switchTab({ url: '/pages/home/home' })
            } else {
              wx.showToast({ title: '登录成功', icon: 'success' })
            }
            console.log('新登录获取到 openid:', openid)
          },
          fail(err) {
            wx.hideLoading()
            console.error('云函数调用失败', err)
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          }
        })
      },
      fail(err) {
        wx.hideLoading()
        console.error('获取用户信息失败', err)
        wx.showToast({ title: '需要授权才能继续', icon: 'none' })
      }
    })
  },

// 创建情侣空间
createCouple() {
  const that = this
  wx.showLoading({ title: '正在创建情侣空间...' })

  wx.cloud.callFunction({
    name: 'createCouple',
    success(res) {
      const { coupleId, inviteCode } = res.result

      // 保存到本地和 globalData
      wx.setStorageSync('coupleId', coupleId)
      app.globalData.coupleId = coupleId

      // 更新页面数据
      that.setData({
        coupleId: coupleId,
        inviteCode: inviteCode   // 新增：用于页面显示邀请码
      })

      wx.hideLoading()
      wx.showToast({
        title: '情侣空间创建成功！',
        icon: 'success',
        duration: 2000
      })

      // 跳转到首页
      wx.switchTab({ url: '/pages/home/home' })

      console.log('✅ 情侣空间已创建，邀请码:', inviteCode, 'coupleId:', coupleId)
    },
    fail(err) {
      wx.hideLoading()
      console.error('创建情侣空间失败', err)
      wx.showToast({
        title: '创建失败，请重试',
        icon: 'none'
      })
    }
  })
},

// 点击“输入邀请码加入”按钮
joinCouple() {
  const that = this
  wx.showModal({
    title: '加入情侣空间',
    placeholderText: '请输入6位邀请码',
    editable: true,
    success(res) {
      if (res.confirm && res.content) {
        const inviteCode = res.content.trim()
        if (inviteCode.length !== 6) {
          wx.showToast({ title: '邀请码必须是6位数字', icon: 'none' })
          return
        }
        that.doJoinCouple(inviteCode)
      }
    }
  })
},

// 执行加入操作
doJoinCouple(inviteCode) {
  const that = this
  wx.showLoading({ title: '正在加入...' })

  wx.cloud.callFunction({
    name: 'joinCouple',
    data: { inviteCode },
    success(res) {
      wx.hideLoading()
      if (res.result.success) {
        const { coupleId, alreadyJoined, msg } = res.result

        wx.setStorageSync('coupleId', coupleId)
        app.globalData.coupleId = coupleId

        that.setData({ coupleId })

        wx.showToast({
          title: msg || '加入成功',
          icon: 'success'
        })

        // 跳转到首页
        wx.switchTab({ url: '/pages/home/home' })

        console.log('✅ 加入结果:', res.result)
      } else {
        wx.showToast({
          title: res.result.msg || '加入失败',
          icon: 'none'
        })
      }
    },
    fail(err) {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  })
},

// 找回我的情侣空间（不依赖本地缓存，直接按 openid 查询）
recoverCouple() {
  const that = this
  wx.showLoading({ title: '查找中...' })

  wx.cloud.callFunction({
    name: 'findMyCouple',
    success(res) {
      wx.hideLoading()
      if (res.result.success) {
        const { coupleId, inviteCode, name } = res.result
        wx.setStorageSync('coupleId', coupleId)
        app.globalData.coupleId = coupleId
        that.setData({ coupleId, inviteCode })
        wx.showModal({
          title: '已找到情侣空间',
          content: `${name}\n邀请码：${inviteCode}`,
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/home/home' })
          }
        })
      } else {
        wx.showToast({ title: res.result.msg || '未找到情侣空间', icon: 'none' })
      }
    },
    fail(err) {
      wx.hideLoading()
      console.error('找回失败:', err)
      wx.showToast({ title: '找回失败，请重试', icon: 'none' })
    }
  })
},

// 重置情侣空间（仅测试用，正式版可删除）
resetCouple() {
  wx.showModal({
    title: '确认重置？',
    content: '重置后会清除本地绑定记录（数据库记录仍保留）',
    success: (res) => {
      if (res.confirm) {
        wx.removeStorageSync('coupleId')
        app.globalData.coupleId = null

        this.setData({
          coupleId: null,
          inviteCode: null
        })

        wx.showToast({
          title: '已重置为未绑定状态',
          icon: 'success'
        })
        console.log('已重置 coupleId')
      }
    }
  })
},

// 添加新菜品（弹窗输入菜名）
addDish() {
  const that = this
  wx.showModal({
    title: '添加新菜品',
    placeholderText: '请输入菜名（如：番茄炒蛋）',
    editable: true,
    success(res) {
      if (res.confirm && res.content) {
        const dishName = res.content.trim()
        that.generateDishWithAI(dishName)
      }
    }
  })
},

goBlindbox() {
  wx.navigateTo({
    url: '/pages/dish/blindbox/select/select'
  })
},

goRestaurantList() {
  const coupleId = wx.getStorageSync('coupleId')
  if (!coupleId) {
    wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
    return
  }
  wx.navigateTo({
    url: '/pages/restaurant/list/list'
  })
},

goRestaurantMap() {
  const coupleId = wx.getStorageSync('coupleId')
  if (!coupleId) {
    wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
    return
  }
  wx.navigateTo({
    url: '/pages/restaurant/map/map'
  })
},

// 调用云函数生成菜谱（新版）
generateDishWithAI(dishName) {
  const that = this
  wx.showLoading({ title: 'AI正在生成菜谱...' })

  wx.cloud.callFunction({
    name: 'generateDish',
    data: { dishName }
  }).then(res => {
    wx.hideLoading()

    if (res.result.success) {
      const dishData = res.result.dishData
      console.log('✅ AI生成成功:', dishData)
    
      // 存到全局，方便编辑页使用
      app.globalData.generatedDish = dishData
    
      // 跳转到编辑预览页
      wx.navigateTo({
        url: '/pages/dish/edit'
      })
    } else {
      console.error('云函数返回失败:', res.result)
      wx.showToast({ title: '生成失败，请查看控制台', icon: 'none' })
    }
  }).catch(err => {
    wx.hideLoading()
    console.error('调用云函数失败:', err)
    wx.showToast({ title: '生成失败', icon: 'none' })
  })
},

// 保存到数据库
saveDishToDB(dishData) {
  const userInfo = wx.getStorageSync('userInfo')
  const coupleId = wx.getStorageSync('coupleId')

  wx.showLoading({ title: '保存中...' })

  wx.cloud.database().collection('dishes').add({
    data: {
      ...dishData,
      creatorOpenid: userInfo.openid,
      coupleId: coupleId,
      createTime: new Date(),
      status: 'active'
    }
  }).then(res => {
    wx.hideLoading()
    wx.showToast({ title: '保存成功！', icon: 'success' })
    console.log('✅ 菜品已保存到数据库，_id:', res._id)
    this.setData({ generatedDish: null })
  }).catch(err => {
    wx.hideLoading()
    console.error('保存失败', err)
    wx.showToast({ title: '保存失败', icon: 'none' })
  })
},

goDishList() {
  wx.navigateTo({
    url: '/pages/dish/list/list'
  })
},

goWantList() {
  wx.navigateTo({
    url: '/pages/dish/want-list/want-list'
  })
},

goTonightMenus() {
  wx.navigateTo({
    url: '/pages/dish/tonight/tonight'
  })
} ,

goFridge() {
  wx.navigateTo({
    url: '/pages/fridge/fridge'
  })
},

goShoppingList() {
  const coupleId = wx.getStorageSync('coupleId')
  if (!coupleId) {
    wx.showToast({ title: '请先绑定情侣空间', icon: 'none' })
    return
  }

  wx.cloud.database().collection('shoppingLists')
    .where({ coupleId: coupleId })
    .orderBy('createTime', 'desc')
    .limit(1)
    .get()
    .then(res => {
      if (res.data.length > 0) {
        wx.navigateTo({
          url: `/pages/dish/shopping-list/shopping-list?id=${res.data[0]._id}`
        })
      } else {
        wx.showToast({ title: '还没有购物清单', icon: 'none' })
      }
    })
    .catch(err => {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
},

showMembers() {
  const coupleId = wx.getStorageSync('coupleId')
  if (!coupleId) return

  wx.cloud.database().collection('couples').doc(coupleId).get()
    .then(res => {
      const members = res.data.members || []
      wx.showModal({
        title: '当前空间成员',
        content: `共 ${members.length} 人\n\n${members.join('\n')}`,
        showCancel: false
      })
    })
}

})