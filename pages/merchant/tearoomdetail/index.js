// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import util from '../../../utils/util'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    dataTrans:null,
    roomDetail:null,
    currentCourselIndex:1,
    showBookPop:false,
    currentDateFlag:true,
    bookingDate: null,
    bookingDateString:null,
    ableBookingTimeList:[],
    startBookingTime:null,
    startBookingTimeNum:null,
    endBookingTime:null,
    endBookingTimeNum:null,
    hasUserInfo:false,
    userInfo:null
  },
  onLoad() {
    const _this = this;
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('openRoomDetail', function (data) {
        resolve(data)
      })
    }).then((res) => {
      this.setData({
        dataTrans:res
      },()=>{
        _this.getRoomDetailById()
      })
    })
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getRoomDetailById:function(){
    request.get('/csTearoom/infoForWx/'+this.data.dataTrans.id,null).then((res)=>{
      const roomDetail = res.data.data || null
      if(roomDetail){
        if(roomDetail.roomBannerUrl){
          const carouselUrlArray = roomDetail.roomBannerUrl.split(",")
          roomDetail.carouselUrlArray = carouselUrlArray
        }else{
          roomDetail.carouselUrlArray = [roomDetail.roomLogoUrl]
        }
        if(roomDetail.facilitiesName){
          const facilitiesNameArray = roomDetail.facilitiesName.split(",")
          roomDetail.facilitiesNameArray = facilitiesNameArray
        }else{
          roomDetail.facilitiesNameArray = []
        }
        if(this.data.dataTrans.usageNotice){
          roomDetail.usageNotice = util.unescape(this.data.dataTrans.usageNotice).replace(/<[^>]*>/g, '')
        }
        if(this.data.dataTrans.address){
          roomDetail.address = this.data.dataTrans.address
        }

        if(this.data.dataTrans.merchantStartTime){
          roomDetail.merchantStartTime = this.data.dataTrans.merchantStartTime
        }else{
          roomDetail.merchantStartTime = '00:00'
        }
        if(this.data.dataTrans.merchantEndTime){
          roomDetail.merchantEndTime = this.data.dataTrans.merchantEndTime
        }else{
          roomDetail.merchantEndTime = '23:59'
        }
        roomDetail.merchantDistance = this.data.dataTrans.merchantDistance
        roomDetail.merchantLongitude = this.data.dataTrans.merchantLongitude
        roomDetail.merchantLatitude = this.data.dataTrans.merchantLatitude
      }
      this.setData({
        roomDetail:roomDetail
      })
    })
  },
  changeCrouselIndex:function(e){
    this.setData({
      currentCourselIndex:e.detail.current+1
    })
  },
  openMapLocation:function(){
    wx.openLocation({
      latitude:Number(this.data.roomDetail.merchantLatitude),
      longitude:Number(this.data.roomDetail.merchantLongitude),
      scale: 18
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
  openBookPop:function(e){
    if(!this.data.hasUserInfo){
      this.getUserProfile()
      return
    }
    const nowDate  = new Date();
    const nowYear = nowDate.getFullYear(); 
    const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
    const nowDay = nowDate.getDate(); //获取当前日(1-31)
    const bookingDate = new Date(nowYear,nowMonth,nowDay)
    this.getBookingAbleTimeList(bookingDate)
    this.setData({
      showBookPop:true,
      bookingDate:bookingDate,
      bookingDateString:nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    })
  },
  getBookingAbleTimeList:function(bookingDate){
    const roomDetail = this.data.roomDetail
    const nowDate  = new Date()
    const minBookingTime = roomDetail.startTime?Number(roomDetail.startTime):1
    const merchantStartTimeArr = roomDetail.merchantStartTime.split(":")
    let merchantStartHour = Number(merchantStartTimeArr[0])
    const merchantEndTimeArr = roomDetail.merchantEndTime.split(":")
    const merchantEndHour = Number(merchantEndTimeArr[0])
    const ableTimeList = []

    // TODO 获取已预订日期，比对。
    const bookedTime = ""
    const bookedTimeArr = bookedTime.split(",");
    
    if(merchantStartHour >= 0 && merchantStartHour < merchantEndHour ){
      for(let i=merchantStartHour;i<=merchantEndHour;i=i+minBookingTime){
        const bookingTimeObj = {}
        if(Number((i+minBookingTime)+merchantStartTimeArr[1]) > Number(merchantEndTimeArr[0]+merchantEndTimeArr[1])){
          break;
        }
        bookingTimeObj.bookingItemStartTime = i+':'+merchantStartTimeArr[1]
        bookingTimeObj.bookingItemStartTimeNum = Number(i+merchantStartTimeArr[1])
        bookingTimeObj.bookingItemEndTime = (i+minBookingTime)+':'+merchantStartTimeArr[1]
        bookingTimeObj.bookingItemEndTimeNum = Number((i+minBookingTime)+merchantStartTimeArr[1])
        // 预约日期 在当天
        if(bookingDate <= nowDate){
          const currentHour = nowDate.getHours();  
          if(currentHour >= i){
            bookingTimeObj.bookingStatus = 0
          }else{
            bookingTimeObj.bookingStatus = 1
          }
        }else{
          bookingTimeObj.bookingStatus = 1
        }
        
        bookedTimeArr.forEach(bookedItem=>{
          const bookingTimeStr = bookingTimeObj.bookingItemStartTime+'-'+bookingTimeObj.bookingItemEndTime
          if(bookingTimeStr == bookedItem){
            bookingTimeObj.bookingStatus = 0
          }
        })

        ableTimeList.push(bookingTimeObj)
      }
    }
    this.setData({
      ableBookingTimeList:ableTimeList
    })
  },
  onBookPopClose:function(){
    this.setData({
      showBookPop:false
    })
  },
  computedBookingDate:function(e){
    const addDays = e.currentTarget.dataset.days
    if(addDays < 0 && this.data.bookingDate <= new Date()){
      return;
    }
    let bookingDate = this.data.bookingDate
    bookingDate.setDate(bookingDate.getDate()+addDays); 
    this.setData({
      bookingDate:bookingDate,
      bookingDateString:bookingDate.getFullYear()+'-'+(bookingDate.getMonth()+1).toString().padStart(2,'0')+'-'+bookingDate.getDate().toString().padStart(2,'0'),
      currentDateFlag:bookingDate <= new Date(),
      startBookingTime:null,
      startBookingTimeNum:null,
      endBookingTime:null,
      endBookingTimeNum:null
    })
    this.getBookingAbleTimeList(bookingDate)
  },
  selectBookingTime:function(e){
    const bookingItem = e.currentTarget.dataset.bookingtime
    if(bookingItem.bookingStatus == 1){
      const bookingDate = this.data.bookingDate
      const nowDate  = new Date()
      // 预约日期 在当天。校验小时。
      if(bookingDate <= nowDate){
        const currentHour = nowDate.getHours();  
        const startBookingTime = this.data.startBookingTime;
        let selectTime = bookingItem.bookingItemStartTime
        if(startBookingTime){
          selectTime = startBookingTime
        }
        if(currentHour >= Number(selectTime.split(":")[0])){
          this.getBookingAbleTimeList(bookingDate)
          this.setData({
            startBookingTime:null,
            startBookingTimeNum:null,
            endBookingTime:null,
            endBookingTimeNum:null,
          })
          return
        }
      }
      if(!this.data.startBookingTime){
        this.setData({
          startBookingTime:bookingItem.bookingItemStartTime,
          startBookingTimeNum:bookingItem.bookingItemStartTimeNum,
          endBookingTime:bookingItem.bookingItemEndTime,
          endBookingTimeNum:bookingItem.bookingItemEndTimeNum
        })
      }else{
        if(this.data.startBookingTimeNum > bookingItem.bookingItemStartTimeNum){
          this.setData({
            startBookingTime:bookingItem.bookingItemStartTime,
            startBookingTimeNum:bookingItem.bookingItemStartTimeNum,
            endBookingTime:bookingItem.bookingItemEndTime,
            endBookingTimeNum:bookingItem.bookingItemEndTimeNum,
          })
        }else if(this.data.startBookingTimeNum == bookingItem.bookingItemStartTimeNum){
          this.setData({
            startBookingTime:null,
            startBookingTimeNum:null,
            endBookingTime:null,
            endBookingTimeNum:null,
          })
        }else{
          this.setData({
            endBookingTime:bookingItem.bookingItemEndTime,
            endBookingTimeNum:bookingItem.bookingItemEndTimeNum
          })
        }
      }
    }    
  },
  confirmBooking:function(){
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum && endBookingTimeNum){
      if((endBookingTimeNum - startBookingTimeNum) >= this.data.roomDetail.startTime ){

      }else{
        Toast('预订时间需大于或等于'+this.data.roomDetail.startTime+'小时');
      }
    }else{
      Toast('请选择预订时间');
    }
  }
})
