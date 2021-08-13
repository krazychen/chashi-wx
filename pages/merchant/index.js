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
      searchCityName:null,
      cityCode:null,
      current:1,
      size:10,
      sortType:1
    },
    // 1：智能、按照距离、价格、时间，2：最近距离，默认5公里，3：按照价格从小到大，4：按照价格从大到小
    sortTypeOption: [
      { text: '智能', value: 1 },
      { text: '最近距离', value: 2 },
      { text: '价格从小到大', value: 3 },
      { text: '价格从大到小', value: 4 }
    ],
    merchantList: [],
    roomList:[],
    selectMerchantId:null,
    nowDateTime:'00:00',
    userLng:null,
    userLat:null,
    currentCityName:''
  },
  onLoad() {
    const that = this
    const sysRes = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:sysRes.windowHeight - app.globalData.tabBarHeight - 40 // 搜索框高度 及 上下pading
    })
    wx.getLocation({
      type: 'gcj02',
      success (res) {
        // 获取当前城市名称
        that.getCurrentCity(res.longitude,res.latitude)
      }
     })
  },
  onShow: function () {
    this.getTabBar().init()
  },
  getCurrentCity:function(longitude,latitude){
    const _this = this;
    wx.request({
      url: "https://apis.map.qq.com/ws/geocoder/v1/?location="+latitude+","+longitude+"&key="+app.globalData.mapKey,
      method: 'GET',
      success: (res => {
        if (res.data.status === 0) {
          const adInfo = res.data.result.ad_info;
          let currentCityCode = null;
          if(adInfo && app.globalData.cityList && app.globalData.cityList.length > 0){
            app.globalData.cityList.forEach(item=>{
              if(item.areaName == adInfo.city){
                currentCityCode = item.areaCode;
              }
            })
          }
          _this.setData({
            searchParam:{
              merchantName:null,
              userLng:longitude,
              userLat:latitude,
              current:1,
              size:10,
              cityCode:currentCityCode,
              searchCityName:adInfo.city,
              cityCode:null
            },
            userLng:longitude,
            userLat:latitude,
            currentCityName: adInfo.city
          },()=>{
            _this.getMerchantListForWx()
          })
        } 
      })
    })
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
      console.log(dataList)
      this.setData({
        merchantList:dataList
      })
    })
  },
  getRoomList:function(e){
    const selectMerchantId = e.currentTarget.dataset.id
    request.post('/csTearoom/getRoomListForWx/'+selectMerchantId,null).then((res)=>{
      const dataList = res.data.data.records||[]
      if(dataList && dataList.length>0){
        this.setData({
          roomList:dataList
        })
      }
      this.setData({
        selectMerchantId:e.currentTarget.dataset.id
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
    const searchParam = this.data.searchParam
    this.setData({
      searchParam:{
        merchantName:e.detail,
        userLng:searchParam.userLng,
        userLat:searchParam.userLat,
        cityCode:searchParam.cityCode,
        searchCityName:searchParam.searchCityName,
        current:1,
        size:10
      }
    },()=>{
      that.getMerchantListForWx()
    })
  },
  openCity:function(){
    const _this = this;
    wx.navigateTo({
      url: '/pages/city/index',
      success: function(res) {
        // 通过eventChannel向被打开页面传送数据
        res.eventChannel.emit('sendCurrentCityName', _this.data.currentCityName)
      },
      events: {
        changeCity: function(data) {
          _this.changeCitySearch(data)
        }
      }
    })
  },
  changeCitySearch:function(city){
      const that = this;
      const searchParam = this.data.searchParam
      this.setData({
        searchParam:{
          merchantName:null,
          userLng:searchParam.userLng,
          userLat:searchParam.userLat,
          cityCode:city.areaCode,
          searchCityName:city.areaName,
          current:1,
          size:10
        }
      },()=>{
        that.getMerchantListForWx()
      })
  },
  toggleSortType:function(){
    this.selectComponent('#sortDropDown').toggle();
  },
  changeSortType:function(e){
    const searchParam = this.data.searchParam
    const _this =this;
    this.setData({
      searchParam:{
        merchantName:searchParam.merchantName,
        userLng:searchParam.userLng,
        userLat:searchParam.userLat,
        cityCode:searchParam.cityCode,
        searchCityName:searchParam.searchCityName,
        sortType:e.detail,
        current:1,
        size:10
      }
    },()=>{
      _this.getMerchantListForWx()
    })
  },
  makePhoneCall:function(e){
    const phoneNo = e.currentTarget.dataset.phoneno
    if(phoneNo){
      wx.makePhoneCall({
        phoneNumber: phoneNo
      })
    }
  },
  openMerchantDetail:function(e){
    const merchant = e.currentTarget.dataset.merchant
    const merchantTrans = {
      id:merchant.id,
      merchantDistance:merchant.merchantDistance
    }
    wx.navigateTo({
      url: '/pages/merchant/merchantdetail/index',
      success: function(res) {
        res.eventChannel.emit('openMerchantDetail', merchantTrans)
      }
    })
  },
  openRoomDetail:function(e){
    const roomId = e.currentTarget.dataset.id
    const merchant = e.currentTarget.dataset.merchant

    const dataTrans = {
      id:roomId,
      merchantDistance:merchant.merchantDistance,
      address:merchant.address,
      usageNotice:merchant.usageNotice
    }
    wx.navigateTo({
      url: '/pages/merchant/tearoomdetail/index',
      success: function(res) {
        res.eventChannel.emit('openRoomDetail', dataTrans)
      }
    })

  }
})
