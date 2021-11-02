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
    selectBookingTimeString:null,
    hasUserInfo:false,
    userInfo:null,
    accountInfo:null,
    bookingLength:null,
    showPickerPop:false,
    pickerTimeList:[]
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
        _this.getAccountInfoByOpenId()
      })
    })
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    this.getAccountInfoByOpenId()
  },
  getAccountInfoByOpenId:function(){
    if(this.data.hasUserInfo){
      request.get('/wxUser/infoForWx/'+this.data.userInfo.openid,null).then((res)=>{
        this.setData({
          accountInfo:res.data.data
        })
      })
    }
  },
  getRoomDetailById:function(){
    const searchRoomParam = {
      id:this.data.dataTrans.id
    }
    if(this.data.hasUserInfo){
      searchRoomParam.openid = this.data.userInfo.openid
    }
    request.post('/csTearoom/infoForWx',searchRoomParam).then((res)=>{
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

  bookAtOnce:function(){
    if(!this.data.hasUserInfo){
      this.getUserProfile()
      return
    }
    const roomDetail = this.data.roomDetail
    const pickerTimeList = []
    const step = roomDetail.startTime?Number(roomDetail.startTime):1
    const merchantEndTime = roomDetail.merchantEndTime
    const bookDate = new Date()
    const nowYear = bookDate.getFullYear(); 
    const nowMonth = bookDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
    const nowDay = bookDate.getDate(); //获取当前日(1-31)
    const merchantEndDate = new Date(nowYear,nowMonth,nowDay,Number(merchantEndTime.split(":")[0]),Number(merchantEndTime.split(":")[1]))
    if(bookDate < merchantEndDate){
      const diffHour = Math.ceil((merchantEndDate.getTime() - bookDate.getTime())/1000/60/60)
      for(let i=0;i<diffHour;i++){
        const objTemp ={
          timelength:i+step,
          label:i+step+'小时'
        }
        pickerTimeList.push(objTemp)
      }
      this.setData({
        showPickerPop:true,
        pickerTimeList
      })
    }else{
      Toast('当天营业已结束')
      this.setData({
        showPickerPop:false,
        pickerTimeList:[]
      })
      return
    }
  },
  onBookAtOncePopClose:function(){
    this.setData({
      showPickerPop:false
    })
  },
  onBookPickerConfirm:function(e){
    const { picker, value, index } = e.detail;
    const searchBookingedObj = {
      tearoomId:this.data.roomDetail.id,
      orderDate:this.data.bookingDateString
    }
    const nowDate  = new Date();
    const nowYear = nowDate.getFullYear(); 
    const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
    const nowDay = nowDate.getDate(); //获取当前日(1-31)
    const bookingDate = new Date(nowYear,nowMonth,nowDay)
    const _this = this
    this.setData({
      showPickerPop:false,
      bookingDate:bookingDate,
      bookingDateString:nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    },()=>{
      request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
          const orderTimeRange = res.data.data || null
          const ableTimeList =  _this.getBookingAbleTimeList(bookingDate,orderTimeRange)
          _this.computeCanBookTime(nowDate,ableTimeList,value.timelength)
      })
    })
  },
  computeCanBookTime:function(bookDate,ableTimeList,bookTimeLeng){
    const roomDetail = this.data.roomDetail
    const bookTimeRange = []
    const currentHour = bookDate.getHours()
    const currentMin = bookDate.getMinutes()
    if(ableTimeList && ableTimeList.length >0){
      let insertIndex = 0
      for(let i=0;i<ableTimeList.length;i++){
        if(ableTimeList[i].bookingStatus==1){
          insertIndex = i
          break;
        }
      }
      const firstEndTimeObj = ableTimeList[insertIndex]
      const endHour = Number(firstEndTimeObj.bookingItemStartTime.split(':')[0])
      const endMin =Number(firstEndTimeObj.bookingItemStartTime.split(':')[1]) 
      const firstTimeObj = {}
      if(currentHour < endHour || currentHour==endHour&& currentMin<endMin){
        firstTimeObj.bookingItemStartTime = currentHour+':'+currentMin.toString().padStart(2,'0')
        firstTimeObj.bookingItemStartTimeNum = Number(currentHour+''+currentMin)
        firstTimeObj.bookingItemEndTime = firstEndTimeObj.bookingItemStartTime
        firstTimeObj.bookingItemEndTimeNum = firstEndTimeObj.bookingItemStartTimeNum
        firstTimeObj.bookingStatus = 1
        bookTimeRange.push(firstTimeObj)
      }
      const step = roomDetail.startTime?Number(roomDetail.startTime):1
      const loopLength = bookTimeLeng / step;
      for(let i=0;i<loopLength-1;i++){
          const currentTimeObj = ableTimeList[insertIndex+i]
          if(currentTimeObj.bookingStatus == 0){
            Toast(currentTimeObj.bookingItemStartTime+'时段被预定')
            break;
          }
          bookTimeRange.push(currentTimeObj)
      }
      const _this = this
      if(firstTimeObj.bookingStatus){
        ableTimeList.splice(insertIndex, 0, firstTimeObj)
      }
      if(bookTimeRange && bookTimeRange.length>0){
        this.setData({
          startBookingTime:bookTimeRange[0].bookingItemStartTime,
          startBookingTimeNum:bookTimeRange[0].bookingItemStartTimeNum,
          endBookingTime:bookTimeRange[bookTimeRange.length-1].bookingItemEndTime,
          endBookingTimeNum:bookTimeRange[bookTimeRange.length-1].bookingItemEndTimeNum,
          ableBookingTimeList:ableTimeList
        },()=>{
          _this.computeBookingLength(true)
        })
      }    
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
    const _this = this
    this.setData({
      showBookPop:true,
      bookingDate:bookingDate,
      bookingDateString:nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    },()=>{
      _this.getBookingedTimeRange()
    })
  },
  getBookingedTimeRange: function(){
    const searchBookingedObj = {
      tearoomId:this.data.roomDetail.id,
      orderDate:this.data.bookingDateString
    }
    const bookingDate = this.data.bookingDate
    let orderTimeRange = null
    request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
      orderTimeRange = res.data.data || null
      this.getBookingAbleTimeList(bookingDate,orderTimeRange)
    })
  },
  getBookingAbleTimeList: function(bookingDate,bookedTime){
    const roomDetail = this.data.roomDetail
    const nowDate  = new Date()
    const currentHour = nowDate.getHours()
    const currentMin = nowDate.getMinutes()
    const minBookingTime = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
    const merchantStartTimeArr = roomDetail.merchantStartTime.split(":")
    const merchantStartHour = Number(merchantStartTimeArr[0])
    const merchantStartMin = Number(merchantStartTimeArr[1])
    const merchantEndTimeArr = roomDetail.merchantEndTime.split(":")
    const merchantEndHour = Number(merchantEndTimeArr[0])
    const merchantEndMin = Number(merchantEndTimeArr[1])
    const ableTimeList = []

    // TODO 获取已预订日期，比对。
    let bookedTimeArr = []
    if(bookedTime){
      bookedTimeArr = bookedTime.split(",");
    }
    let hourFlag = false
    // 判断最小的预定时间，除以0.5小时 是奇数还是偶数，偶数只要加小时。 奇数要判断分钟。
    // if((minBookingTime/0.5)%2==0){
    //   hourFlag = true
    // }
    if(merchantStartHour >= 0 && merchantStartHour < merchantEndHour ){
      if(hourFlag){
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
            if(currentHour >i){
              bookingTimeObj.bookingStatus = 0
            }else if(currentHour == i && currentMin>= merchantStartMin){
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
      }else{
        const merchantStart = Number(merchantStartTimeArr[0]+merchantStartTimeArr[1])
        const merchantEnd = Number(merchantEndTimeArr[0]+merchantEndTimeArr[1])
        let beginLoop = merchantStart
        while(beginLoop<merchantEnd){
          let hourNo = parseInt((minBookingTime/0.5/2))
          const minuteNo =((minBookingTime/0.5/2) - hourNo) *  60
          let beginHour = (beginLoop+'').substring(0,(beginLoop+'').length-2)
          const beginMin = (beginLoop+'').substring((beginLoop+'').length-2)
          if(beginLoop==0 || beginHour==''){
            beginHour = '0'
          }
          let endMin = beginMin
          if(beginLoop==0 ){
            endMin='00'
          }
          if(minuteNo>0){
            const computeMin = Number(beginMin) + minuteNo - 60
            if(computeMin>=0){
              hourNo = hourNo+1
            }            
            endMin = Math.abs(Number(beginMin) + minuteNo - 60)+''
            if(endMin=='60' || endMin=='0'){
              endMin = '00'
            }
          }
          const bookingTimeObj = {}
          bookingTimeObj.bookingItemStartTime = beginHour+':'+beginMin
          bookingTimeObj.bookingItemStartTimeNum = Number(beginHour+''+beginMin)
          bookingTimeObj.bookingItemEndTime = (Number(beginHour)+hourNo)+':'+endMin
          bookingTimeObj.bookingItemEndTimeNum = Number(Number(beginHour)+hourNo+''+endMin) 
          beginLoop = Number(Number(beginHour)+hourNo+''+endMin) 
          if(beginLoop>merchantEnd){
            break
          }
          // 预约日期 在当天
          if(bookingDate <= nowDate){
            if(currentHour >Number(beginHour)){
              bookingTimeObj.bookingStatus = 0
            }else if(currentHour == Number(beginHour) && currentMin>= Number(beginMin)){
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
    }
    // this.insertCurrentBookingTime(ableTimeList)
    this.setData({
      ableBookingTimeList:ableTimeList
    })
    return ableTimeList
  },
  insertCurrentBookingTime:function(ableTimeList){
    const nowDate  = new Date(new Date().valueOf() + 60 * 1000 * 5)
    if(this.data.bookingDate <= nowDate){
      const currentHour = nowDate.getHours()
      const currentMin = nowDate.getMinutes()
      if(ableTimeList && ableTimeList.length >0){
        let insertIndex = 0
        for(let i=0;i<ableTimeList.length;i++){
          if(ableTimeList[i].bookingStatus==1){
            insertIndex = i
            break;
          }
        }
        const currentEndTimeObj = ableTimeList[insertIndex]
        const endHour = Number(currentEndTimeObj.bookingItemStartTime.split(':')[0])
        const endMin =Number(currentEndTimeObj.bookingItemStartTime.split(':')[1]) 
        if(currentHour < endHour || currentHour==endHour&& currentMin<endMin){
          const currentTimeObj = {}
          currentTimeObj.bookingItemStartTime = currentHour+':'+currentMin
          currentTimeObj.bookingItemStartTimeNum = Number(currentHour+''+currentMin)
          currentTimeObj.bookingItemEndTime = currentEndTimeObj.bookingItemStartTime
          currentTimeObj.bookingItemEndTimeNum = currentEndTimeObj.bookingItemStartTimeNum
          currentTimeObj.bookingStatus = 1
          ableTimeList.splice(insertIndex, 0, currentTimeObj)
        }
      }
      // splice(2, 0, "three")
    }
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
    const _this = this
    this.setData({
      bookingDate:bookingDate,
      bookingDateString:bookingDate.getFullYear()+'-'+(bookingDate.getMonth()+1).toString().padStart(2,'0')+'-'+bookingDate.getDate().toString().padStart(2,'0'),
      currentDateFlag:bookingDate <= new Date(),
      startBookingTime:null,
      startBookingTimeNum:null,
      endBookingTime:null,
      endBookingTimeNum:null
    },()=>{
      _this.getBookingedTimeRange()
    })
  },
  selectBookingTime:function(e){
    const bookingItem = e.currentTarget.dataset.bookingtime
    if(bookingItem.bookingStatus == 1){
      const bookingDate = this.data.bookingDate
      const nowDate  = new Date()
      // 预约日期 在当天。校验小时。
      if(bookingDate <= nowDate){
        const currentHour = nowDate.getHours();  
        const currentMin = nowDate.getMinutes()
        const startBookingTime = this.data.startBookingTime;
        let selectTime = bookingItem.bookingItemStartTime
        if(startBookingTime){
          selectTime = startBookingTime
        }
        if(currentHour > Number(selectTime.split(":")[0]) ||(currentHour == Number(selectTime.split(":")[0]) && currentMin>=Number(selectTime.split(":")[1]))){
          this.getBookingedTimeRange()
          this.setData({
            startBookingTime:null,
            startBookingTimeNum:null,
            endBookingTime:null,
            endBookingTimeNum:null,
          },()=>{
            _this.computeBookingLength()
          })
          return
        }
      }
      const _this = this
      if(!this.data.startBookingTime){
        this.setData({
          startBookingTime:bookingItem.bookingItemStartTime,
          startBookingTimeNum:bookingItem.bookingItemStartTimeNum,
          endBookingTime:bookingItem.bookingItemEndTime,
          endBookingTimeNum:bookingItem.bookingItemEndTimeNum
        },()=>{
          _this.computeBookingLength()
        })
      }else{
        if(this.data.startBookingTimeNum > bookingItem.bookingItemStartTimeNum){
          this.setData({
            startBookingTime:bookingItem.bookingItemStartTime,
            startBookingTimeNum:bookingItem.bookingItemStartTimeNum,
            endBookingTime:bookingItem.bookingItemEndTime,
            endBookingTimeNum:bookingItem.bookingItemEndTimeNum,
          },()=>{
            _this.computeBookingLength()
          })
        }else if(this.data.startBookingTimeNum == bookingItem.bookingItemStartTimeNum){
          this.setData({
            startBookingTime:null,
            startBookingTimeNum:null,
            endBookingTime:null,
            endBookingTimeNum:null,
          },()=>{
            _this.computeBookingLength()
          })
        }else{
          const ableBookingTimeList =  this.data.ableBookingTimeList
          let existDisabled = false
          ableBookingTimeList.forEach(item=>{
            if(item.bookingStatus == 0 && item.bookingItemStartTimeNum >= this.data.startBookingTimeNum 
              && item.bookingItemEndTimeNum <=bookingItem.bookingItemEndTimeNum){
                existDisabled = true
            }
          })
          if(existDisabled){
            Toast("中间时段已被预订，请重新选择")
          }else{
            this.setData({
              endBookingTime:bookingItem.bookingItemEndTime,
              endBookingTimeNum:bookingItem.bookingItemEndTimeNum
            },()=>{
              _this.computeBookingLength()
            })
          }
        }
      }
    }    
  },
  computeBookingLength:function(openFlag){
    const _this = this
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum>=0 && endBookingTimeNum >=0){
        const ableBookingTimeList =  this.data.ableBookingTimeList
        let bookingTimeStr = "";
        ableBookingTimeList.forEach(item=>{
          if(item.bookingStatus == 1 && item.bookingItemStartTimeNum >= startBookingTimeNum 
            && item.bookingItemEndTimeNum <=endBookingTimeNum){
              bookingTimeStr = bookingTimeStr+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
          }
        })
        bookingTimeStr = bookingTimeStr.substring(0,bookingTimeStr.length-1)
        this.setData({
          bookingLength:bookingTimeStr.split(",").length * this.data.roomDetail.startTime,
          selectBookingTimeString:bookingTimeStr
        },()=>{
          if(openFlag){
            _this.confirmBooking()
          }
        })
    }else{
      this.setData({
        bookingLength:0,
        selectBookingTimeString:''
      })
    }
  },
  confirmBooking:function(){
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum>=0 && endBookingTimeNum>=0){
      if(this.data.bookingLength >= this.data.roomDetail.startTime ){
        // const ableBookingTimeList =  this.data.ableBookingTimeList
        // let bookingTimeStr = "";
        // ableBookingTimeList.forEach(item=>{
        //   if(item.bookingStatus == 1 && item.bookingItemStartTimeNum >= startBookingTimeNum 
        //     && item.bookingItemEndTimeNum <=endBookingTimeNum){
        //       bookingTimeStr = bookingTimeStr+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
        //   }
        // })
        // bookingTimeStr = bookingTimeStr.substring(0,bookingTimeStr.length-1)
        // this.setData({
        //   selectBookingTimeString:bookingTimeStr
        // })
    console.log(this.data.selectBookingTimeString)
        const dataTrans = {
          bookingTimeStr:this.data.selectBookingTimeString,
          bookingDate:this.data.bookingDate,
          bookingDateString:this.data.bookingDateString,
          startBookingTime:this.data.startBookingTime,
          startBookingTimeNum:this.data.startBookingTimeNum,
          endBookingTime:this.data.endBookingTime,
          endBookingTimeNum:this.data.endBookingTimeNum,
          bookingLength:this.data.bookingLength,
          ...this.data.roomDetail
        }

        let bookingPrice = this.data.roomDetail.hoursAmount
        if(this.data.accountInfo.csMembercardOrderQueryVo){
          bookingPrice = this.data.roomDetail.menberAmount
        }
        dataTrans.bookingPrice = bookingPrice
        wx.navigateTo({
          url: '/pages/merchant/tearoomorder/index',
          success: function(res) {
            res.eventChannel.emit('openRoomOrder', dataTrans)
          }
        })
      }else{
        Toast('预订时间需大于或等于'+this.data.roomDetail.startTime+'小时');
      }
    }else{
      Toast('请选择预订时间');
    }
  }
})
