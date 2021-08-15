

const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  data: {
    hasPhoneNumber:false,
    hasUserInfo:false,
    canIUseGetUserProfile: false,
    userInfo:{}
  },

  onLoad: function (options) {
    // 空调一次。
    wx.login({
      timeout: 0,
    })

  },
  getPhoneNumber:function(e){
    wx.login({
      success: (res)=> {
        if (res.code) {
          const userData = {iv:e.detail.iv,encryptedData:e.detail.encryptedData,jsCode:res.code}
          request.post('/wxUser/wxLogin',userData).then(result=>{
            const userInfoRes = {...result.data.data}
            if( userInfoRes && userInfoRes.phoneNumber){
              this.setData({
                hasPhoneNumber:true
              })
            }
          })
        } else {
          console.log('登录失败！' + res.errMsg)
        }
      }
    })
  },
  backTo:function(){
    wx.navigateBack({
      delta: 0,
    })
  }
})