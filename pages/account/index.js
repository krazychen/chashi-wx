// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    accountInfo:null
  },
  onLoad() {
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  onShow: function () {
    this.getTabBar().init()
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    this.getAccountInfoByOpenId()
  },
  getAccountInfoByOpenId:function(){
    if(this.data.hasUserInfo){
      request.get('/wxUser/infoForWx/'+this.data.userInfo.openid,null).then((res)=>{
        this.setData({
          accountInfo:res.data.data
        })
      })
    }
  },
  openTopup:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/topup/index',
      })
    }else{
      this.getUserProfile()
    }
  },
  openCouponList:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/coupon/index',
      })
    }else{
      this.getUserProfile()
    }
  },
  openMemberCard:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/membercard/index',
      })
    }else{
      this.getUserProfile()
    }
  },
  openOrderList:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/orderinfo/index',
      })
    }else{
      this.getUserProfile()
    }
  }
})
