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
      userLng:null,
      userLat:null,
      current:1,
      size:10
    },
    merchantList: [],
    roomList:[],
    merchantName:null,
    selectMerchantId:null,
    nowDateTime:'00:00',
    userLng:null,
    userLat:null
  },
  onLoad() {
    const that = this
    const sysRes = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:sysRes.windowHeight - app.globalData.tabBarHeight - 40 // 搜索框高度 及 上下pading
    })
    wx.getLocation({
      type: 'wgs84',
      success (res) {
        that.setData({
          searchParam:{
            merchantName:null,
            userLng:res.longitude,
            userLat:res.latitude,
            current:1,
            size:10
          },
          userLng:res.longitude,
          userLat:res.latitude
        },()=>{
          that.getMerchantListForWx()
        })
      }
     })
  },
  onShow: function () {
    this.getTabBar().init()
  },
  getMerchantListForWx:function(){
    request.post('/csMerchant/getPageListForWx',this.data.searchParam).then((res)=>{
      const dataList = res.data.data.records||[]
      if(dataList && dataList.length>0){
        const nowDate  = new Date();
        const nowYear = nowDate.getFullYear(); 
        const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
        const nowDay = nowDate.getDate(); //获取当前日(1-31)
        dataList.forEach(item=>{
          if(!item.startTime || item.startTime==null || item.startTime==''){
            item.startTime = "00:00";
          }
          if(!item.endTime|| item.startTime==null || item.startTime==''){
            item.endTime = "23:59";
          }
          const startTimeArr = item.startTime.split(":");
          const startDate = new Date( nowYear, nowMonth, nowDay, startTimeArr[0], startTimeArr[1], 0);
          const endTimeArr = item.endTime.split(":");
          const endDate = new Date( nowYear, nowMonth, nowDay, endTimeArr[0], endTimeArr[1], 0);
          if(nowDate>=startDate && nowDate<=endDate){
            item.businessState = '营业中'
          }else{
            item.businessState = '休息'
          }
        })
      }
      this.setData({
        merchantList:dataList
      })
    })
  },
  getRoomList:function(e){
    const selectMerchantId = e.target.dataset.id
    request.post('/csTearoom/getRoomListForWx/'+selectMerchantId,null).then((res)=>{
      const dataList = res.data.data.records||[]
      if(dataList && dataList.length>0){
        this.setData({
          roomList:dataList
        })
      }
      this.setData({
        selectMerchantId:e.target.dataset.id
      })
    })
  },
  cleanRoomList:function(e){
    this.setData({
      selectMerchantId:null,
      roomList:[]
    })
  },
  onSearch:function(e) {
    const that = this;
    this.setData({
      searchParam:{
        merchantName:e.detail,
        userLng:that.data.userLng,
        userLat:that.data.userLat,
        current:1,
        size:10
      }
    },()=>{
      that.getMerchantListForWx()
    })
  }
})
