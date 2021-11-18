// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';
import Dialog from '../../../miniprogram_npm/@vant/weapp/dialog/dialog'
import util from '../../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    hasUserInfo:false,
    userInfo:null,
    accountInfo:null,
    orderList:[],
    merchantDetail:null,
    showPickerPop:false,
    pickerTimeList:[],
    roomDetail:null,
    bookingDate: null,
    bookingDateString:null,
    ableBookingTimeList:[],
    startBookingTime:null,
    startBookingTimeNum:null,
    endBookingTime:null,
    endBookingTimeNum:null,
    selectBookingTimeString:null,
    bookingLength:null,
    bookAtOnceStartTime:null,
    bookAtOnceEndTime:null,
    bookingLengthCompare:null,
    bookAtOnceExtraLength:0,
    bookAtOnceFirstObj:null
  },
  onLoad() {
    const _this = this
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    },()=>{
      const eventChannel = _this.getOpenerEventChannel()
      // 真机需要判断 是否拿到数据
      new Promise((resolve, reject) => {
        eventChannel.on('openRenewList', function (data) {
          resolve(data)
        })
      }).then((res) => {
        _this.setData({
          orderList:res
        },()=>{
          _this.getRenewOrderList(),
          _this.getAccountInfoByOpenId()
        })
      })
    })
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
  getRenewOrderList(){
    const orderList = this.data.orderList
    if(orderList && orderList.length>0){
      orderList.forEach(item=>{
        if(item.orderDate){
          item.orderDate = item.orderDate.substring(0,10)+" "
        }
        if(item.orderTimerage){
           const orderRange = item.orderTimerage.split(',')
           if(orderRange.length>1){
             const startRange = orderRange[0].split('-')[0]
             const endRange = orderRange[orderRange.length-1].split('-')[1]
             item.orderTimerage = startRange +'-'+endRange
           }
        }
      })
      this.setData({
        orderList
      })
    }
  },
  renewOrder:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const _this = this
    const merchatDetailSearchParam = {
      id:orderitem.merchantId
    }
    if(this.data.hasUserInfo){
      merchatDetailSearchParam.openid = this.data.userInfo.openid
    }
    request.post('/csMerchant/infoForWx',merchatDetailSearchParam).then((res)=>{
      const merchantDetail = res.data.data
      if(merchantDetail){
        const searchRoomParam = {
          id:orderitem.tearoomId
        }
        if(this.data.hasUserInfo){
          searchRoomParam.openid = this.data.userInfo.openid
        }
        request.post('/csTearoom/infoForWx',searchRoomParam).then((res)=>{
          const roomDetail = res.data.data || null
          if(roomDetail){
            if(merchantDetail.address){
              roomDetail.address = merchantDetail.address
            }
            if(merchantDetail.usageNotice){
              roomDetail.usageNotice = util.unescape(merchantDetail.usageNotice)
            }
            if(merchantDetail.merchantStartTime){
              roomDetail.merchantStartTime = merchantDetail.merchantStartTime
            }else{
              roomDetail.merchantStartTime = '00:00'
            }
            if(merchantDetail.merchantEndTime){
              roomDetail.merchantEndTime = merchantDetail.merchantEndTime
            }else{
              roomDetail.merchantEndTime = '23:59'
            }

            const pickerTimeList = []
            const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
            const merchantEndTime = roomDetail.merchantEndTime
            const orderEndTime = new Date(orderitem.orderDate.trim() +" " +orderitem.orderTimerage.split("-")[1])
            // 续单最少1小时，需要预留0.5小时的保洁，也就是如果续单1个小时，需要后面1.5个小时
            const continueAtLeastDateTime = new Date(orderEndTime.valueOf() + 60 * 1000 * 90)
            const merchantEndDate = new Date(orderitem.orderDate + " "+ merchantEndTime)
            if(continueAtLeastDateTime >= merchantEndDate){
              Toast('最小续单时长超过营业时间，无法续单')
              this.setData({
                showPickerPop:false,
                pickerTimeList:[]
              })
              return
            }
            
            const orderEndTimeStr = orderitem.orderTimerage.split("-")[1]
            // 续单开始时间
            const beingTimeNum = Number(orderEndTimeStr.split(":")[0]+orderEndTimeStr.split(":")[1])
            let nextEndTimeStr = null
            const bookingDate = new Date(orderitem.orderDate.trim())
            const searchBookingedObj = {
              tearoomId:roomDetail.id,
              orderDate: orderitem.orderDate.trim()
            }
            this.setData({
              roomDetail,
              bookingDate:bookingDate,
              bookingDateString:orderitem.orderDate.trim()
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
                  const nextEndDate = new Date(orderitem.orderDate.trim() +" " +nextEndTimeStr)
                  let hourLength = ((nextEndDate.getTime() - orderEndTime.getTime())/1000/60/60).toFixed(4)
                  hourLength = util.formatDecimal(hourLength,1,5)
                  if(hourLength < 1.5){
                    Toast('当前包厢无法续单，请预约其他包厢！')
                    return
                  }
                  
                  for(let i=step;i<=hourLength;i=i+step){
                    if(i>= 1){
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
                    bookAtOnceStartTime:orderEndTimeStr,
                    bookAtOnceEndTime:nextEndTimeStr
                    
                  })
              })
            })
          }else{
            Toast('续单失败')
          }
        })
      }else{
        Toast('续单失败')
      }
    })
  },
  onBookAtOncePopClose:function(){
    this.setData({
      showPickerPop:false
    })
  },
  onBookPickerConfirm:function(e){
    const { picker, value, index } = e.detail;
    if(value.timelength<1){
      Toast('最少续单1小时')
      return
    }
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

    const continueEndTime =  new Date(new Date(this.data.bookingDateString+" "+ bookAtOnceStartTime).valueOf() + 60 * 1000 * 60 * (bookTimeLeng) )
    const canBookAtLeastBegin =  new Date(new Date(this.data.bookingDateString+" "+ bookAtOnceStartTime).valueOf() + 60 * 1000 * 60 * (bookTimeLeng+0.5) )
    const merchantEndDate = new Date(this.data.bookingDateString + " "+ roomDetail.merchantEndTime)
    if(canBookAtLeastBegin > merchantEndDate){
      Toast('续单时长超过营业时间，无法续单！')
    }
    const canBookAtLeastBeginHour = canBookAtLeastBegin.getHours()
    const canBookAtLeastBeginMin = canBookAtLeastBegin.getMinutes()
    const canBookAtLeastBeginTimeNum = Number(canBookAtLeastBeginHour+canBookAtLeastBeginMin.toString().padStart(2,'0'))
    const continueEndTimeNum = Number(continueEndTime.getHours()+continueEndTime.getMinutes().toString().padStart(2,'0'))
    for(let i=0;i<ableTimeList.length;i++){
      if(ableTimeList[i].bookingItemStartTimeNum <=continueEndTimeNum && ableTimeList[i].bookingItemEndTimeNum >= canBookAtLeastBeginTimeNum){
        if(ableTimeList[i].bookingStatus == 0){
          Toast('续单时段被预定，无法续单！')
          return
        }
      }
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
          bookingLengthCompare = bookingTimeStr.split(",").length
          bookingLengthNum = bookingTimeStr.split(",").length *  this.data.roomDetail.timeRange
        }

        this.setData({
          bookingLengthCompare,
          bookingLength: bookingLengthNum,
          selectBookingTimeString:bookingTimeStr
        },()=>{
          if(openFlag){
            
              _this.confirmBooking()
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
