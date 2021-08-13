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
    showBookPop:false
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

    this.setData({
      showBookPop:true
    })
  },
  getBookingAbleTimeList:function(){

  },
  onBookPopClose:function(){
    this.setData({
      showBookPop:false
    })
  }
})
