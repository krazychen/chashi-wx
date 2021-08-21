// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import util from '../../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    orderDetail:null,
    showPop:false,
    couponList:[]
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('openRoomOrder', function (data) {
        console.log(data)
        resolve(data)
      })
    }).then((res) => {
      this.setData({
        orderDetail:res
      })
    })
    this.getCouponListByUserId()
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
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
  onPopClose:function(){
    this.setData({
      showPop:false
    })
  },
  openPop:function(e){
    this.setData({
      showPop:true
    })
  },
})
