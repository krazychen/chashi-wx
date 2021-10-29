const app = getApp()
Page({
  data: {
    weburl:''
  },

  onLoad: function (options) {
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('openUrl', function (data) {
        resolve(data)
      })
    }).then((res) => {
      this.setData({
        weburl:res.jumpLink
      })
    })
  }
})