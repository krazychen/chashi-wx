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
    paramConfigObj: app.globalData.paramConfigObj,
    scrollHeight:null,
    advertiseBannerList: [],
    hasUserInfo:false,
    userInfo:null,
    searchObj:{
      queryType:3,
      nameAphone:null,
      current:1,
      size:9999
    },
    orderNum:0,
    orderList:[]
  },
  onLoad(query) {
    const res = wx.getSystemInfoSync()
    const _this = this
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight - 200 -100 - 10,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo,
      paramConfigObj:app.globalData.paramConfigObj
    },()=>{
      _this.getOrderList()
    })
    this.getParamConfig()
    this.getAdvertiseBannerListForWx()
    if(query.scene){
      const scene = decodeURIComponent(query.scene)
      app.globalData.recommendId = scene
    }else{
      app.globalData.recommendId = null
    }
  },
  onShow: function () {
    const _this = this
    this.getTabBar().init()
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo,
      paramConfigObj:app.globalData.paramConfigObj
    },()=>{
      _this.getOrderList()
    })
  },
  getAdvertiseBannerListForWx:function(){
    request.post('/csAdvertise/getBannerListForWx',{}).then((res)=>{
      let dataList = res.data.data||[]
      this.setData({
        advertiseBannerList:dataList
      })
    })
  },
  getParamConfig:function(){
    request.get('/sysConfig/getAllConfigDataCache',{}).then((res)=>{
      const paramConfigList = res.data.data||[]
      const paramConfigObj = {}
      if(paramConfigList.length>0){
        paramConfigList.forEach((item)=>{
          if(item.configKey.startsWith("wx_homepage_static")){
            paramConfigObj[item.configKey] = item.configValue
          }
        })
      }
      app.globalData.paramConfigObj = paramConfigObj
      if(app.globalData.paramConfigObj){
        this.setData({
          paramConfigObj:app.globalData.paramConfigObj
        })
      }
    })
  },
  goToMerchantList(){
    if(this.data.hasUserInfo){
      wx.switchTab({
        url: '/pages/merchant/index',
      })
    }else{
      this.getUserProfile()
    }
  },
  getOrderList(){
    if(this.data.hasUserInfo){
      const searchObj = this.data.searchObj
      searchObj.nameAphone = this.data.userInfo.phoneNumber
      request.post('/csMerchantOrder/getCsMerchantOrderListForWx',searchObj).then((res)=>{
        const orderList = res.data.data.records || []
        if(orderList && orderList.length>0){
          this.setData({
            orderNum:orderList.length,
            orderList
          })
        }
      })
    }
  },
  goToOrderList:function(){
    if(this.data.hasUserInfo){
      const queryObj = {
        queryType:3,
        queryFrom:'index'
      }
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
  openWeb:function(e){
    const item = e.currentTarget.dataset.item
    const _this = this;
    wx.navigateTo({
      url: '/pages/webpage/index',
      success: function(res) {
        // 通过eventChannel向被打开页面传送数据
        res.eventChannel.emit('openUrl', item)
      }
    })
  },
  goToRenewList:function(e){
    const orderList = this.data.orderList
    if(!orderList || orderList.length <=0){
      Toast('没有订单，无需续单，请先预订')
      return
    }
    const renewOrderList = []
    orderList.forEach(item=>{
      const orderRange = item.orderTimerage.split(',')
      const orderDateStartTimeStr = item.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[0]+":00"
      const orderDateEndTimeStr = item.orderDate.substring(0,10) + " "+ orderRange[orderRange.length-1].split('-')[1]+":00"
      const orderDateStartTime = util.fixDate(orderDateStartTimeStr)
      const orderDateEndTime = util.fixDate(orderDateEndTimeStr)
      const nowDate = new Date()
      if(nowDate >= orderDateStartTime && nowDate <= orderDateEndTime){
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
  }
})
