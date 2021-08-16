

const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  data: {
    hasPhoneNumber:false,
    canIUseGetUserProfile: false,
    currentSessionObj:null
  },

  onLoad: function (options) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    // 调用一次 。获取sessionkey
    const _this = this
    wx.login({
      success (res) {
        _this.getSessionKeyObj(res.code)        
      }
    })
  },
  getSessionKeyObj:function(jsCode){
    const _this = this
    const userData = {jsCode}
    request.post('/wxUser/wxLoginForSK',userData).then(result=>{
      if(result.data.data){
        _this.setData({
          currentSessionObj:{...result.data.data}
        })
      }else{
        _this.setData({
        currentSessionObj:null
      })}
    })
  },
  // checksession 通过，currentSessionObj为空时。重新从服务端缓存中获取。
  getSessionKeyObjReGet:function(){
    const _this = this
    wx.login({
      success (res) {
        const userData = {jsCode,reGetFlag:"1"}
        request.post('/wxUser/wxLoginForSK',userData).then(result=>{
          if(result.data.data){
            _this.setData({
              currentSessionObj:{...result.data.data}
            })
          }else{
            _this.setData({
            currentSessionObj:null
          })}
        })
      }
    })
  },
  getPhoneNumber:function(e){
    const _this = this
    wx.checkSession({
      success () {
        //session_key 未过期，并且在本生命周期一直有效
        if(!_this.data.currentSessionObj){
          _this.getSessionKeyObjReGet()
        }
        const userData = {iv:e.detail.iv,encryptedData:e.detail.encryptedData,..._this.data.currentSessionObj}
        request.post('/wxUser/wxLogin',userData).then(result=>{
          const userInfoRes = {...result.data.data}
          if( userInfoRes && userInfoRes.phoneNumber){
            _this.setData({
              hasPhoneNumber:true
            })
          }else{
            _this.setData({
              hasPhoneNumber:false
            })
          }
        })
      },
      fail () {
        // session_key 已经失效，需要重新执行登录流程
        const _this = this
        wx.login({
          success: (res)=> {
            if (res.code) {
              _this.getSessionKeyObj(res.code)
              const userData = {iv:e.detail.iv,encryptedData:e.detail.encryptedData,..._this.data.currentSessionObj}
              request.post('/wxUser/wxLogin',userData).then(result=>{
                const userInfoRes = {...result.data.data}
                if( userInfoRes && userInfoRes.phoneNumber){
                  _this.setData({
                    hasPhoneNumber:true
                  })
                }else{
                  _this.setData({
                    hasPhoneNumber:false
                  })
                }
              })
            } else {
              console.log('登录失败！' + res.errMsg)
            }
          }
        })
      }
    })
  },
  getUserNickName(){
    const _this = this
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (resuser) => {
        const userData = {..._this.data.currentSessionObj,avatarUrl:resuser.userInfo.avatarUrl,nickName:resuser.userInfo.nickName}
        request.post('/wxUser/wxUserUpdateNickName',userData).then(result=>{
          const userInfoRes = {...result.data.data}
          this.setUserInfo(userInfoRes) 
          this.backTo()        
        })
      }
    })
  },
  backTo:function(){
    wx.navigateBack({
      delta: 0,
    })
  },
  setUserInfo:function(userInfo){
    wx.removeStorageSync('userInfo')
    app.globalData.userInfo = {...app.globalData.userInfo,...userInfo}
    wx.setStorageSync('userInfo', app.globalData.userInfo)
    app.globalData.hasUserInfo = true
  }
})