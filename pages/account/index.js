// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast'
import util from '../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    accountInfo:null,
    showQrCode:false
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
        if(res.data.data && res.data.data.balance && res.data.data.balance>0){
          res.data.data.balance = Number(Number(res.data.data.balance).toFixed(2))
        }
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
  openOrderList:function(e){
    const queryType = e.currentTarget.dataset.querytype
    const queryObj = {
      queryType,
      queryFrom:'accountInfo'
    }
    
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/orderinfo/index',
        success: function(res) {
          res.eventChannel.emit('openOrderList', queryObj)
        }
      })
    }else{
      this.getUserProfile()
    }
  },
  openQrCode:function(){
    if(this.data.hasUserInfo){
      const accountInfo = this.data.accountInfo
      if(!accountInfo.recommendQr){
        request.get('/wxUser/getWxQRCode/'+accountInfo.id,null).then((res)=>{
          accountInfo.recommendQr = res.data.data
          this.setData({
            accountInfo,
            showQrCode:true
          })
        })
      }else{
        this.setData({
          showQrCode:true
        })
      }   
    }else{
      this.getUserProfile()
    }
  },
  onQrClose:function(){
    this.setData({
      showQrCode:false
    }) 
  },
  openCouponCenter:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/couponcenter/index',
      })
    }else{
      this.getUserProfile()
    }
    
  },
  goToRenewList:function(){
    if(this.data.hasUserInfo && this.data.userInfo.phoneNumber && this.data.userInfo.phoneNumber!=''){
      const searchObj = {
        queryType:4,
        nameAphone:null,
        current:1,
        size:9999
      }
      searchObj.nameAphone = this.data.userInfo.phoneNumber
      request.post('/csMerchantOrder/getCsMerchantOrderListForWx',searchObj).then((res)=>{
        const orderList = res.data.data.records || []
        if(!orderList || orderList.length <=0){
          Toast('没有订单，无需续单，请先预订')
          return
        }
        const renewOrderList = []
        orderList.forEach(item=>{
          let orderEndDateString = item.orderDate
          let orderEndTimeRage = item.orderTimerage
          if(item.nextOrderDate && item.nextOrderDate !=''){
            orderEndDateString = item.nextOrderDate
            orderEndTimeRage = item.nextOrderTimerage
          }

          const orderRange = orderEndTimeRage.split(',')
          const orderDateStartTimeStr = orderEndDateString.substring(0,10) + " "+ orderRange[0].split('-')[0]+":00"
          const orderDateEndTimeStr = orderEndDateString.substring(0,10) + " "+ orderRange[orderRange.length-1].split('-')[1]+":00"
          const orderDateStartTime = util.fixDate(orderDateStartTimeStr)
          const orderDateEndTime = util.fixDate(orderDateEndTimeStr)
          const nowDate = new Date()
          if(nowDate <= orderDateEndTime){
            renewOrderList.push(item)
          }
        })
        if(renewOrderList.length <= 0 ){
          Toast('没有在使用中的订单，无需续单，请先使用订单')
          return
        }
        wx.navigateTo({
          url: '/pages/index/renew/index',
          success: function(res) {
            res.eventChannel.emit('openRenewList', renewOrderList)
          }
        })
      })
    }else{
      this.getUserProfile()
    }
  }
})
