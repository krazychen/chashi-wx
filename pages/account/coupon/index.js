// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    couponList:[]
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  onShow(){
    this.getCouponListByUserId()
  },
  getCouponListByUserId:function(){
    request.get('/csCouponReleased/getCouponForWx/'+this.data.userInfo.id,null).then((res)=>{
      const couponList = res.data.data
      if(couponList && couponList.length>0){
        couponList.forEach(item=>{
          if(item.startTime){
            item.startTime = item.startTime.substring(0,10)
          }
          if(item.endTime){
            item.endTime = item.endTime.substring(0,10)
          }
        })
      }
      this.setData({
        couponList
      })
    })
  },
  goToMerchantList(){
    wx.switchTab({
      url: '/pages/merchant/index',
    })
  },
  openCouponCenter:function(){
    wx.navigateTo({
      url: '/pages/account/couponcenter/index',
    })

  }
})
