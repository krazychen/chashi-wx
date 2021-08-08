// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    searchParam:{
      merchantName:null,
      current:1,
      size:10
    },
    merchantList: [],
    roomList:[],
    selectMerchantId:null
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight - 40 // 搜索框高度 及 上下pading
    })
    this.getMerchantListForWx()
  },
  onShow: function () {
    this.getTabBar().init()
  },
  getMerchantListForWx:function(){
    request.post('/csMerchant/getPageListForWx',this.data.searchParam).then((res)=>{
      const dataList = res.data.data.records||[]
      if(dataList && dataList.length>0){
        this.setData({
          merchantList:dataList
        })
      }
    })
  },
  getRoomList:function(e){
    this.setData({
      selectMerchantId:e.target.dataset.id
    })
  }
})
