// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d3gngjkrfd5d7df82', // 你的环境ID
        traceUser: true,
      })
    }

    this.globalData = {
      userInfo: null,
      coupleId: null, // 后续存放情侣空间ID
    }
  }
})