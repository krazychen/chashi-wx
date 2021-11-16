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
    bookingLength:null
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
    console.log(orderList)
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
            const bookDate = new Date()
            const nowYear = bookDate.getFullYear(); 
            const nowMonth = bookDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
            const nowDay = bookDate.getDate(); //获取当前日(1-31)
            const merchantEndDate = new Date(nowYear,nowMonth,nowDay,Number(merchantEndTime.split(":")[0]),Number(merchantEndTime.split(":")[1]))
            if(bookDate < merchantEndDate){
              const diffHour = Math.floor((merchantEndDate.getTime() - bookDate.getTime())/1000/60/60)
              for(let i=0;i<diffHour;i=i+step){
                const objTemp ={
                  timelength:i+step,
                  label:i+step+'小时'
                }
                pickerTimeList.push(objTemp)
              }
              this.setData({
                showPickerPop:true,
                pickerTimeList,
                roomDetail
              })
            }else{
              Toast('当天营业已结束')
              this.setData({
                showPickerPop:false,
                pickerTimeList:[],
                roomDetail:null
              })
              return
            }
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
    const nowDate  = new Date();
    const nowYear = nowDate.getFullYear(); 
    const nowMonth = nowDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
    const nowDay = nowDate.getDate(); //获取当前日(1-31)
    const bookingDate = new Date(nowYear,nowMonth,nowDay)
    const _this = this
    const searchBookingedObj = {
      tearoomId:this.data.roomDetail.id,
      orderDate: nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    }
    this.setData({
      showPickerPop:false,
      bookingDate:bookingDate,
      bookingDateString:nowYear+'-'+(nowMonth+1).toString().padStart(2,'0')+'-'+nowDay.toString().padStart(2,'0')
    },()=>{
      request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
          const orderTimeRange = res.data.data || null
          const ableTimeList =  util.getBookingAbleTimeList(bookingDate,orderTimeRange,_this.data.roomDetail)
          this.setData({
            ableBookingTimeList:ableTimeList
          },()=>{
            _this.computeCanBookTime(nowDate,ableTimeList,value.timelength)
          })
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
      let firstTimeObj = {}
      let addIndex = 0
      if(currentHour < endHour || currentHour==endHour&& currentMin<endMin){
        if(currentHour < endHour){
          firstTimeObj = firstEndTimeObj
          addIndex = 1
        }
        if(currentHour == endHour){
          firstTimeObj.bookingItemStartTime = currentHour+':'+currentMin.toString().padStart(2,'0')
          firstTimeObj.bookingItemStartTimeNum = Number(currentHour+''+currentMin)
          firstTimeObj.bookingItemEndTime = firstEndTimeObj.bookingItemStartTime
          firstTimeObj.bookingItemEndTimeNum = firstEndTimeObj.bookingItemStartTimeNum
          firstTimeObj.bookingStatus = 1
        }
        bookTimeRange.push(firstTimeObj)
      }
      const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
      let loopLength = bookTimeLeng / step
      if(loopLength > (ableTimeList.length- insertIndex)){
        loopLength = ableTimeList.length - insertIndex
      }
      if(addIndex > 0){
        for(let i=0;i<(loopLength - 1);i++){
          if((insertIndex+i+addIndex) > ableTimeList.length){
            break;
          }
          const currentTimeObj = ableTimeList[insertIndex+i+addIndex]
            if(currentTimeObj.bookingStatus == 0){
              Toast(currentTimeObj.bookingItemStartTime+'时段被预定')
              break;
            }
            bookTimeRange.push(currentTimeObj)
        }
      }else{
        for(let i=0;i<(loopLength - 1);i++){
            const currentTimeObj = ableTimeList[insertIndex+i]
            if(currentTimeObj.bookingStatus == 0){
              Toast(currentTimeObj.bookingItemStartTime+'时段被预定')
              break;
            }
            bookTimeRange.push(currentTimeObj)
        }
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
          bookingLength:bookingTimeStr.split(",").length * this.data.roomDetail.timeRange,
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
        selectBookingTimeString:''
      })
    }
  },
  confirmBooking:function(){
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum>=0 && endBookingTimeNum>=0){
      if(this.data.bookingLength >= Number(this.data.roomDetail.startTime) ){
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
