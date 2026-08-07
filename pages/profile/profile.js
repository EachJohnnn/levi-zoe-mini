const app = getApp()

Page({
  data: {
    userInfo: null,
    coupleId: null,
    coupleName: '',
    coupleMembers: [],
    isCreator: false,
    editingName: false,
    newCoupleName: ''
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const userInfo = wx.getStorageSync('userInfo')
    const coupleId = wx.getStorageSync('coupleId')

    if (!userInfo) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    this.setData({ userInfo, coupleId })

    if (coupleId) {
      this.loadCoupleInfo(coupleId, userInfo.openid)
    }
  },

  loadCoupleInfo(coupleId, myOpenid) {
    wx.cloud.database().collection('couples').doc(coupleId).get()
      .then(res => {
        const data = res.data
        const isCreator = data.creatorOpenid === myOpenid
        this.setData({
          coupleName: data.name || '我们的小厨房',
          coupleMembers: data.members || [],
          isCreator
        })
      })
      .catch(err => {
        console.error('加载情侣空间失败:', err)
      })
  },

  // 编辑用户昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      placeholderText: '输入新昵称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newName = res.content.trim()
          const openid = this.data.userInfo.openid
          wx.cloud.database().collection('users').where({ openid }).get()
            .then(userRes => {
              if (userRes.data.length > 0) {
                return wx.cloud.database().collection('users').doc(userRes.data[0]._id).update({
                  data: { nickName: newName }
                })
              }
            })
            .then(() => {
              const userInfo = { ...this.data.userInfo, nickName: newName }
              wx.setStorageSync('userInfo', userInfo)
              this.setData({ userInfo })
              wx.showToast({ title: '修改成功', icon: 'success' })
            })
            .catch(err => {
              console.error(err)
              wx.showToast({ title: '修改失败', icon: 'none' })
            })
        }
      }
    })
  },

  // 编辑情侣空间名
  editCoupleName() {
    if (!this.data.isCreator) {
      wx.showToast({ title: '只有创建者可以修改', icon: 'none' })
      return
    }
    wx.showModal({
      title: '修改空间名称',
      placeholderText: '输入新名称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newName = res.content.trim()
          wx.cloud.database().collection('couples').doc(this.data.coupleId).update({
            data: { name: newName }
          }).then(() => {
            this.setData({ coupleName: newName })
            wx.showToast({ title: '修改成功', icon: 'success' })
          }).catch(err => {
            console.error(err)
            wx.showToast({ title: '修改失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 踢人
  kickMember(e) {
    if (!this.data.isCreator) {
      wx.showToast({ title: '只有创建者可以移除成员', icon: 'none' })
      return
    }
    const openid = e.currentTarget.dataset.openid
    if (openid === this.data.userInfo.openid) {
      wx.showToast({ title: '不能移除自己', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认移除',
      content: '确定将该成员移出情侣空间吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          const members = this.data.coupleMembers.filter(m => m !== openid)
          wx.cloud.database().collection('couples').doc(this.data.coupleId).update({
            data: { members }
          }).then(() => {
            this.setData({ coupleMembers: members })
            wx.showToast({ title: '已移除', icon: 'success' })
          }).catch(err => {
            console.error(err)
            wx.showToast({ title: '移除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 退出/解散空间
  exitCouple() {
    const action = this.data.isCreator ? '解散' : '退出'
    wx.showModal({
      title: `确认${action}`,
      content: `确定要${action}情侣空间吗？${this.data.isCreator ? '所有数据将被保留但无法恢复绑定。' : ''}`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('coupleId')
          app.globalData.coupleId = null
          this.setData({ coupleId: null, coupleName: '', coupleMembers: [] })
          wx.showToast({ title: `已${action}`, icon: 'success' })
          wx.switchTab({ url: '/pages/home/home' })
        }
      }
    })
  },

  // 跳转绑定页
  goLogin() {
    wx.navigateTo({ url: '/pages/index/index' })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出登录',
      content: '退出后会清除本地登录状态，需要重新授权登录',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('coupleId')
          app.globalData.userInfo = null
          app.globalData.coupleId = null
          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
  },

  // 上传头像
  uploadAvatar() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })

        // 上传到云存储
        const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`
        let uploadedAvatarUrl = ''
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath
        }).then(uploadRes => {
          const fileID = uploadRes.fileID
          uploadedAvatarUrl = fileID
          const openid = that.data.userInfo.openid
          // 更新数据库：直接保存云文件 ID，避免临时 URL 过期后头像消失
          return wx.cloud.database().collection('users').where({ openid }).get().then(userRes => {
            if (userRes.data.length > 0) {
              return wx.cloud.database().collection('users').doc(userRes.data[0]._id).update({
                data: { avatarUrl: fileID }
              })
            }
          })
        }).then(() => {
          const userInfo = { ...that.data.userInfo, avatarUrl: uploadedAvatarUrl }
          wx.setStorageSync('userInfo', userInfo)
          that.setData({ userInfo })
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
        }).catch(err => {
          wx.hideLoading()
          console.error(err)
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  }
})
