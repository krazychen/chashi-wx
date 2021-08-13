// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import util from '../../../utils/util'

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
    ableBookingTimeList:[]
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
  getRoomDetailById:function(){
    request.get('/csTearoom/infoForWx/'+this.data.dataTrans.id,null).then((res)=>{
      const roomDetail = res.data.data
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
      }
      roomDetail.merchantDistance = this.data.dataTrans.merchantDistance
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
  makePhoneCall:function(e){
    const phoneNo = e.currentTarget.dataset.phoneno
    if(phoneNo){
      wx.makePhoneCall({
        phoneNumber: phoneNo
      })
    }
  },
  openBookPop:function(e){
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
    // 预约日期 在当天
    if(bookingDate <= nowDate){
      const currentHour = nowDate.getHours();  
      if(currentHour > merchantStartHour && currentHour < merchantEndHour){
        merchantStartHour = currentHour + minBookingTime
      }else{
        merchantStartHour = -1
      }
    }
    if(merchantStartHour >= 0 && merchantStartHour < merchantEndHour ){
      for(let i=merchantStartHour;i<=merchantEndHour;i=i+minBookingTime){
        const bookingTimeObj = {}
        bookingTimeObj.bookingTime = i+':'+merchantStartTimeArr[1]
        bookingTimeObj.bookingStatus = 1
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
      currentDateFlag:bookingDate <= new Date()
    })
    this.getBookingAbleTimeList(bookingDate)
  }
})
