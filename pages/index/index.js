// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    advertiseBannerList: []
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight - 200 -100 - 10
    })
    this.getAdvertiseBannerListForWx()
  },
  onShow: function () {
    this.getTabBar().init()
  },
  getAdvertiseBannerListForWx:function(){
    request.post('/csAdvertise/getBannerListForWx',{}).then((res)=>{
      let dataList = res.data.data||[]
      this.setData({
        advertiseBannerList:dataList
      })
    })
  }
})
