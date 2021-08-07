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
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    }
  },
  methods: {
    getUserProfile(e) {
      if(!app.globalData.userInfo){
        wx.removeStorageSync('userInfo')
        wx.getUserProfile({
          desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
          success: (resuser) => {
            wx.login({
              success: (res)=> {
                if (res.code) {
                  const userData = {...resuser,jsCode:res.code};
                  request.post('/wxUser/wxLogin',userData).then(result=>{
                    const userInfoRes = {...result.data.data,...userData.userInfo}
                    this.setUserInfo(userInfoRes)
                  });
                } else {
                  console.log('登录失败！' + res.errMsg)
                }
              }
            })
          }
        })
      }
    },
    logout:function(){
      wx.removeStorageSync('userInfo')
      app.globalData.userInfo = null
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: false
      })
    },
    setUserInfo:function(userInfo){
      wx.removeStorageSync('userInfo')
      app.globalData.userInfo = {...app.globalData.userInfo,...userInfo}
      wx.setStorageSync('userInfo', app.globalData.userInfo)
      this.setData({
        userInfo:app.globalData.userInfo,
        hasUserInfo: userInfo!==null?true:false
      })
    }
  }
})