// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

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
    orderNum:0
  },
  onLoad() {
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
            orderNum:orderList.length
          })
        }
      })
    }
  },
  goToOrderList:function(){
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/orderinfo/index',
        success: function(res) {
          res.eventChannel.emit('openOrderList', 3)
        }
      })
    }else{
      this.getUserProfile()
    }
  },
  openWeb:function(e){
    const item = e.currentTarget.dataset.item
    // const _this = this;
    // wx.navigateTo({
    //   url: '/pages/webpage/index',
    //   success: function(res) {
    //     // 通过eventChannel向被打开页面传送数据
    //     res.eventChannel.emit('openUrl', item)
    //   }
    // })
  }
})
