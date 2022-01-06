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
    bookingLengthCompare:null,
    showPickerPop:false,
    pickerTimeList:[],
    bookAtOnceStartTime:null,
    bookAtOnceFirstObj:null,
    bookAtOnceEndTime:null,
    bookAtOnceExtraLength:0 // 立即预定 起始时长 分钟
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
          roomDetail.usageNotice = util.unescape(this.data.dataTrans.usageNotice)
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
        roomDetail.contactPhonse = this.data.dataTrans.contactPhonse
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
    const _this = this
    const roomDetail = this.data.roomDetail
    const pickerTimeList = []
    const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
    const merchantEndTime = roomDetail.merchantEndTime
    // 营业结束时间
    const merchantEndDate = new Date(nowYear,nowMonth,nowDay,Number(merchantEndTime.split(":")[0]),Number(merchantEndTime.split(":")[1]))
    const nowDate  = new Date(new Date().valueOf() + 60 * 1000 * 5)
    if(nowDate >= merchantEndDate){
      Toast('当天营业已结束')
      this.setData({
        showPickerPop:false,
        pickerTimeList:[]
      })
      return
    }
    const nowYear = nowDate.getFullYear(); 
    const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
    const nowDay = nowDate.getDate(); //获取当前日(1-31)
    const nowHour = nowDate.getHours(); //获取当前小时数(0-23)
    const nowMin = nowDate.getMinutes(); //获取当前分钟数(0-59)
    // 当前时分
    const beingTimeNum = Number(nowHour+nowMin.toString().padStart(2,'0'))
    let nextEndTimeStr = null
    const bookingDate = new Date(nowYear,nowMonth,nowDay)
    const searchBookingedObj = {
      tearoomId:roomDetail.id,
      orderDate: nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    }
    this.setData({
      bookingDate:bookingDate,
      bookingDateString:nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    },()=>{
      request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
          const orderTimeRange = res.data.data || null
          const ableTimeList =  util.getBookingAbleTimeList(bookingDate,orderTimeRange,roomDetail)
          for(let i=0;i<ableTimeList.length;i++){
            if(ableTimeList[i].bookingStatus == 0 && ableTimeList[i].bookingItemStartTimeNum >= beingTimeNum){
              nextEndTimeStr = ableTimeList[i].bookingItemStartTime
              break;
            }
          }
          // 下一个被预定的开始时间 没有的话 取营业结束时间
          if(!nextEndTimeStr){
            nextEndTimeStr = merchantEndTime
          }
          const nextEndDate = new Date(nowYear,nowMonth,nowDay,Number(nextEndTimeStr.split(":")[0]),Number(nextEndTimeStr.split(":")[1]))
          const diffHour = Math.floor((nextEndDate.getTime() - nowDate.getTime())/1000/60/60)
          if(diffHour < roomDetail.startTime){
            Toast('当前时段被预定')
            return
          }
          let hourLength = ((nextEndDate.getTime() - nowDate.getTime())/1000/60/60).toFixed(4)
          hourLength = util.formatDecimal(hourLength,1,5)
          for(let i=step;i<=hourLength;i=i+step){
            if(i>= roomDetail.startTime){
              const objTemp ={
                timelength:i,
                label:i+'小时'
              }
              pickerTimeList.push(objTemp)
            }
          }
          _this.setData({
            showPickerPop:true,
            pickerTimeList,
            bookAtOnceStartTime:nowHour+":"+nowMin.toString().padStart(2,'0'),
            bookAtOnceEndTime:nextEndTimeStr
          })
      })
    })
  },
  onBookAtOncePopClose:function(){
    this.setData({
      showPickerPop:false
    })
  },
  onBookPickerConfirm:function(e){
    const { picker, value, index } = e.detail;
    const _this = this
    const searchBookingedObj = {
      tearoomId:this.data.roomDetail.id,
      orderDate: this.data.bookingDateString
    }
    this.setData({
      showPickerPop:false
    },()=>{
      request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
          const orderTimeRange = res.data.data || null
          const ableTimeList =  util.getBookingAbleTimeList(_this.data.bookingDate,orderTimeRange,_this.data.roomDetail)
          _this.computeCanBookTime(_this.data.bookingDate,ableTimeList,value.timelength)
      })
    })
  },
  computeCanBookTime:function(bookDate,ableTimeList,bookTimeLeng){
    const roomDetail = this.data.roomDetail
    const bookAtOnceStartTime = this.data.bookAtOnceStartTime
    const bookTimeRange = []
    const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
    let loopLength = bookTimeLeng / step
    if(loopLength > (ableTimeList.length)){
      loopLength = ableTimeList.length
    }
    let firstNextStartTimeObj = null
    let startIndex = 999999999
    const bookingAtOnceStartTimeNum =  Number(bookAtOnceStartTime.split(":")[0] + ""+bookAtOnceStartTime.split(":")[1])
    for(let i=0;i<ableTimeList.length;i++){
      if(ableTimeList[i].bookingStatus == 1 && ableTimeList[i].bookingItemStartTimeNum >= bookingAtOnceStartTimeNum){
        firstNextStartTimeObj = ableTimeList[i]
        startIndex = i
        break;
      }
    }

    if(startIndex == 999999999){
      Toast(bookAtOnceStartTime+'时段被预定')
      return
    }
    let extraMin = 0
    let firstTimeObj = {}
    if(bookAtOnceStartTime != firstNextStartTimeObj.bookingItemStartTime){
      firstTimeObj.bookingItemStartTime = bookAtOnceStartTime
      firstTimeObj.bookingItemStartTimeNum = Number(bookAtOnceStartTime.split(':')[0]+''+bookAtOnceStartTime.split(':')[1])
      firstTimeObj.bookingItemEndTime = firstNextStartTimeObj.bookingItemStartTime
      firstTimeObj.bookingItemEndTimeNum = firstNextStartTimeObj.bookingItemStartTimeNum
      firstTimeObj.bookingStatus = 1
      bookTimeRange.push(firstTimeObj)
      const nowYear = bookDate.getFullYear(); 
      const nowMonth = bookDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
      const nowDay = bookDate.getDate(); //获取当前日(1-31)
      const extraBeginDateTime =  new Date(nowYear,nowMonth,nowDay,Number(bookAtOnceStartTime.split(":")[0]),Number(bookAtOnceStartTime.split(":")[1]))
      const extraEndDateTime =  new Date(nowYear,nowMonth,nowDay,Number(firstNextStartTimeObj.bookingItemStartTime.split(":")[0]),Number(firstNextStartTimeObj.bookingItemStartTime.split(":")[1]))
      extraMin = Math.floor((extraEndDateTime.getTime() - extraBeginDateTime.getTime())/1000/60)
    }
    for(let i=0;i<loopLength;i++){
      const currentTimeObj = ableTimeList[startIndex+i]
      if(currentTimeObj.bookingStatus == 0){
        Toast(currentTimeObj.bookingItemStartTime+'时段被预定')
        break;
      }
      bookTimeRange.push(currentTimeObj)
    }

    const _this = this
    if(bookTimeRange && bookTimeRange.length>0){
      this.setData({
        startBookingTime:bookTimeRange[0].bookingItemStartTime,
        startBookingTimeNum:bookTimeRange[0].bookingItemStartTimeNum,
        endBookingTime:bookTimeRange[bookTimeRange.length-1].bookingItemEndTime,
        endBookingTimeNum:bookTimeRange[bookTimeRange.length-1].bookingItemEndTimeNum,
        bookAtOnceExtraLength:extraMin,
        bookAtOnceFirstObj:firstTimeObj,
        ableBookingTimeList:ableTimeList
      },()=>{
        _this.computeBookingLength(true)
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
    const _this = this
    this.setData({
      showBookPop:true,
      bookAtOnceStartTime:null,
      bookAtOnceFirstObj:null,
      bookAtOnceEndTime:null,
      bookAtOnceExtraLength:0, // 立即预定 起始时长 分钟
      bookingLengthCompare:0,
      bookingLength: 0,
      selectBookingTimeString:null,
          startBookingTime:null,
          startBookingTimeNum:null,
          endBookingTime:null,
          endBookingTimeNum:null,
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
    // 判断最小的预定时间，除以0.5小时 是奇数还是偶数，偶数只要加小时。 奇数要判断分钟。
    // if((minBookingTime/0.5)%2==0){
    //   hourFlag = true
    // }
    if(merchantStartHour >= 0 && merchantStartHour < merchantEndHour ){
      const merchantStart = Number(merchantStartTimeArr[0]+merchantStartTimeArr[1])
      const merchantEnd = Number(merchantEndTimeArr[0]+merchantEndTimeArr[1])
      let beginLoop = merchantStart
      while(beginLoop<merchantEnd){
        let hourNo = parseInt((minBookingTime/0.5/2))
        const minuteNo =((minBookingTime/0.5/2) - hourNo) *  60
        let beginHour = (beginLoop+'').substring(0,(beginLoop+'').length-2)
        const beginMin = (beginLoop+'').substring((beginLoop+'').length-2).padStart(2,'0')
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
          const bookedItemArr = bookedItem.split("-")
          const bookedStartTime = Number(bookedItemArr[0].replace(":",''))
          const bookedEndTime = Number(bookedItemArr[1].replace(":",''))
          const bookingTimeStr = bookingTimeObj.bookingItemStartTime+'-'+bookingTimeObj.bookingItemEndTime
          if(bookingTimeStr == bookedItem || (bookingTimeObj.bookingItemStartTimeNum<=bookedStartTime && bookingTimeObj.bookingItemEndTimeNum == bookedEndTime)){
            bookingTimeObj.bookingStatus = 0
          }
        })
        ableTimeList.push(bookingTimeObj)
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
        let bookingTimeStr = ""
        let bookingLengthCompare = 0
        let bookingLengthNum = 0
        if(this.data.bookAtOnceExtraLength > 0 && this.data.bookAtOnceFirstObj){
          bookingTimeStr = this.data.bookAtOnceFirstObj.bookingItemStartTime+"-"+this.data.bookAtOnceFirstObj.bookingItemEndTime+',';
        }
        ableBookingTimeList.forEach(item=>{
          if(item.bookingStatus == 1 && item.bookingItemStartTimeNum >= startBookingTimeNum 
            && item.bookingItemEndTimeNum <=endBookingTimeNum){
              bookingTimeStr = bookingTimeStr+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
          }
        })
        bookingTimeStr = bookingTimeStr.substring(0,bookingTimeStr.length-1)
        if(this.data.bookAtOnceExtraLength > 0 && this.data.bookAtOnceFirstObj){
          bookingLengthCompare = bookingTimeStr.split(",").length - 1
          
          const totalMin = parseInt((bookingTimeStr.split(",").length - 1) *  this.data.roomDetail.timeRange * 60 +  this.data.bookAtOnceExtraLength)
          bookingLengthNum = (totalMin/60).toFixed(2)
        }else{
          bookingLengthCompare = bookingTimeStr.split(",").length *  this.data.roomDetail.timeRange
          bookingLengthNum = bookingTimeStr.split(",").length *  this.data.roomDetail.timeRange
        }

        this.setData({
          bookingLengthCompare,
          bookingLength: bookingLengthNum,
          selectBookingTimeString:bookingTimeStr
        },()=>{
          if(openFlag){
            // if((bookingTimeStr.split(",").length * _this.data.roomDetail.timeRange) < Number(_this.data.roomDetail.startTime)){
            //   Toast('预订时间需大于或等于'+_this.data.roomDetail.startTime+'小时');
            //   _this.setData({
            //     showPickerPop:false
            //   })
            // }else{
              _this.confirmBooking()
            // }
          }
        })
    }else{
      this.setData({
        bookingLength:0,
        selectBookingTimeString:'',
        bookAtOnceExtraLength:0,
        bookAtOnceFirstObj:null
      })
    }
  },
  confirmBooking:function(){
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum>=0 && endBookingTimeNum>=0){
      if(this.data.bookingLengthCompare >= Number(this.data.roomDetail.startTime) ){
        const dataTrans = {
          bookingTimeStr:this.data.selectBookingTimeString,
          bookingDate:this.data.bookingDate,
          bookingDateString:this.data.bookingDateString,
          startBookingTime:this.data.startBookingTime,
          startBookingTimeNum:this.data.startBookingTimeNum,
          endBookingTime:this.data.endBookingTime,
          endBookingTimeNum:this.data.endBookingTimeNum,
          bookingLength:this.data.bookingLength,
          bookAtOnceExtraLength:this.data.bookAtOnceExtraLength,
          bookAtOnceFirstObj:this.data.bookAtOnceFirstObj,
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
