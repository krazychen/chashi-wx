// index.js
// 获取应用实例
const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    searchParam:{
      merchantName:null,
      userLng:null,
      userLat:null,
      searchCityName:'',
      cityCode:null,
      current:1,
      size:10,
      sortType:1
    },
    totalPage:0,
    triggered:false,
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
    currentCityName:'',
    hasUserInfo:false,
    userInfo:null,
    mapKey:'FMXBZ-TXULW-2SVRL-RY734-IDFSF-2QFWF'
  },
  onLoad() {
    const sysRes = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:sysRes.windowHeight - app.globalData.tabBarHeight - 40, // 搜索框高度 及 上下pading
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    const that = this
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
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getCurrentCity:function(longitude,latitude){
    const _this = this;
    wx.request({
      url: "https://apis.map.qq.com/ws/geocoder/v1/?location="+latitude+","+longitude+"&key="+_this.data.mapKey,
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
            merchantList:[],
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
    const merchantList = this.data.merchantList || []
    request.post('/csMerchant/getPageListForWx',this.data.searchParam).then((res)=>{
      const dataList = res.data.data.records||[]
      const total = res.data.data.total
      let totalPage = 0
      if(dataList && dataList.length>0){
        const nowDate  = new Date();
        const nowYear = nowDate.getFullYear(); 
        const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
        const nowDay = nowDate.getDate(); //获取当前日(1-31)
        dataList.forEach(item=>{
          if(!item.startTime || item.startTime==null || item.startTime==''){
            item.startTime = "00:00";
          }
          if(!item.endTime|| item.endTime==null || item.endTime==''){
            item.endTime = "23:59";
          }
          const startTimeArr = item.startTime.split(":");
          const startDate = new Date( nowYear, nowMonth, nowDay, startTimeArr[0], startTimeArr[1], 0);
          const endTimeArr = item.endTime.split(":");
          const endDate = new Date( nowYear, nowMonth, nowDay, endTimeArr[0], endTimeArr[1], 0);
          let exStartDate = null
          let exEndDate = null
          if(item.exStartTime && item.exStartTime!='' && item.exStartTime!=null){
            const exStartTimeArr = item.exStartTime.split(":");
            exStartDate = new Date( nowYear, nowMonth, nowDay, exStartTimeArr[0], exStartTimeArr[1], 0);
          }
          if(item.exEndTime && item.exEndTime!='' && item.exEndTime!=null){
            const exEndTimeArr = item.exEndTime.split(":");
            exEndDate = new Date( nowYear, nowMonth, nowDay, exEndTimeArr[0], exEndTimeArr[1], 0);
          }

          if(!item.releaseStatus || item.releaseStatus == '0' ){
            item.businessState = '休息'
          }else{
            if(nowDate>=startDate && nowDate<=endDate){
              if(exStartDate && exEndDate){
                if(nowDate>exStartDate && nowDate< exEndDate){
                  item.businessState = '休息'
                }else{
                  item.businessState = '营业中'
                }
              }{
                item.businessState = '营业中'
              }
            }else{
              item.businessState = '休息'
            }
          }
        })
        totalPage = Math.ceil(total/this.data.searchParam.size)
      }
      this.setData({
        merchantList:merchantList.concat(dataList),
        totalPage,
        triggered: false
      })
    })
  },
  getRoomList:function(e){
    const selectMerchantId = e.currentTarget.dataset.id
    const searchTeaRoomParam = {
      merchantId:selectMerchantId
    }
    if(this.data.hasUserInfo){
      searchTeaRoomParam.openid = this.data.userInfo.openid
    }
    request.post('/csTearoom/getRoomListForWx',searchTeaRoomParam).then((res)=>{
      const dataList = res.data.data.records||[]
      this.setData({
        roomList:dataList
      })
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
      },
      merchantList:[]
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
        },
        merchantList:[]
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
      },
      merchantList:[]
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
    if(!merchant.releaseStatus || merchant.releaseStatus == '0' ){
      Toast('商家休息中')
      return
    }
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
    if(!merchant.releaseStatus || merchant.releaseStatus == '0' ){
      Toast('商家休息中')
      return
    }
    const dataTrans = {
      id:roomId,
      merchantDistance:merchant.merchantDistance,
      address:merchant.address,
      usageNotice:merchant.usageNotice,
      merchantStartTime:merchant.startTime,
      merchantEndTime:merchant.endTime,
      merchantExStartTime:merchant.exStartTime,
      merchantExEndTime:merchant.exEndTime,
      merchantLongitude:merchant.longitude,
      merchantLatitude:merchant.latitude,
      contactPhonse:merchant.contactPhonse
    }
    wx.navigateTo({
      url: '/pages/merchant/tearoomdetail/index',
      success: function(res) {
        res.eventChannel.emit('openRoomDetail', dataTrans)
      }
    })
  },
  onRefresh:function(){
    if (this.data.triggered) return
    const searchParam = this.data.searchParam
    searchParam.current = 1
    searchParam.size = 10
    this.setData({
      searchParam,
      merchantList:[]
    },()=>{
       this.getMerchantListForWx();
    })
  },
  onRestore:function(){
    this.setData({
      triggered: false
    })
  },
  onAbort:function(){
    this.setData({
      triggered: false
    })
  },
  lower(e) {
    let that = this;
    const searchParam = this.data.searchParam
    const page = searchParam.current;
    if((page+1) <= this.data.totalPage){
      searchParam.current = page+1
      this.setData({
        searchParam
      },()=>{
        this.getMerchantListForWx()
      })
    }
  }
})
