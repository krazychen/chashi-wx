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
    userInfo:null
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight - 200 -100 - 10,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    this.getParamConfig()
    this.getAdvertiseBannerListForWx()
  },
  onShow: function () {
    this.getTabBar().init()
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
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
  }
})
