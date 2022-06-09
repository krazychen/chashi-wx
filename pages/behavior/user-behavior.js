import request from '../../utils/request'
//获取应用实例
const app = getApp()

module.exports = Behavior({
  data: {
    hasUserInfo:false,
    canIUseGetUserProfile: false,
    userInfo:{}
  },
  created:function(){
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    wx.showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.phoneNumber && userInfo.phoneNumber!='') {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      })
      this.setUserInfo(userInfo)
    }
  },
  methods: {
    getUserProfile:function() {
      if(!app.globalData.userInfo){
        wx.navigateTo({
          url: '/pages/login/index'
        })
      }
    },
    logout:function(){
      wx.removeStorageSync('userInfo')
      app.globalData.userInfo = null
      app.globalData.hasUserInfo = false
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: false
      })
    },
    setUserInfo:function(userInfo){
      wx.removeStorageSync('userInfo')
      app.globalData.userInfo = {...app.globalData.userInfo,...userInfo}
      wx.setStorageSync('userInfo', app.globalData.userInfo)
      if(app.globalData.userInfo.phoneNumber && app.globalData.userInfo.phoneNumber!=''){
        app.globalData.hasUserInfo = true
      }else{
        app.globalData.hasUserInfo = false
      }
    }
  }
})