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
    nextBookingDate:null,
    nextBookingDateString:null,
    ableBookingTimeList:[],
    startBookingTime:null,
    startBookingTimeNum:null,
    endBookingTime:null,
    endBookingTimeNum:null,
    selectBookingTimeString:null,
    nextSelectBookingTimeString:null,
    bookingLength:null,
    bookAtOnceStartDate:null,
    bookAtOnceStartDateString:null,
    bookAtOnceStartTime:null,
    bookAtOnceEndTime:null,
    bookingLengthCompare:null,
    bookAtOnceExtraLength:0,
    bookAtOnceFirstObj:null,
    originOrderId:null,
     // 包含保洁时长的
     orderStartTime:null,// 订单开始时间 
     orderEndTime:null,// 订单结束时间 
     orderTimerageClean:null,// 订单时间段 包含保洁时长
     nextOrderStartTime:null,// 订单下一天开始时间 
     nextOrderEndTime:null,// 订单下一天结束时间 
     nextOrderTimerageClean:null // 订单下一天时间段 包含保洁时长
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
        let hasNextDate = false
        let actStartDate = item.orderDate
        let actStartDateTime = null
        let actEndDate = item.orderDate
        let actEndDateTime = null
        if(item.orderTimerage){
            const orderRange = item.orderTimerage.split(',')
            if(orderRange.length > 0){
              const startRange = orderRange[0].split('-')[0]
              const endRange = orderRange[orderRange.length-1].split('-')[1]
              actStartDateTime = startRange
              actEndDateTime = endRange
            }
        }
        
        if(item.nextOrderDate && item.nextOrderDate !=''){
          hasNextDate = true
          actEndDate = item.nextOrderDate
          const nextOrderRange = item.nextOrderTimerage.split(',')
          if(nextOrderRange.length > 0){
            const endRange = nextOrderRange[nextOrderRange.length-1].split('-')[1]
            actEndDateTime = endRange
          }
        }
        

        let useTimeRange = actStartDate.substring(0,10)+" " + actStartDateTime
        // 跨天
        if(hasNextDate){
          useTimeRange = useTimeRange + '-' + actEndDate.substring(0,10)+" " + actEndDateTime
        }else{
          useTimeRange =useTimeRange + '-' + actEndDateTime
        }
        item.hasNextDate = hasNextDate
        item.actStartDateString = actStartDate.substring(0,10)
        item.actStartDate = new Date(Number(actStartDate.substring(0,4)),Number(actStartDate.substring(5,7))-1,Number(actStartDate.substring(8,10)),0,0,0)
        item.actStartDateTime = actStartDateTime
        item.actEndDateString = actEndDate.substring(0,10)
        item.actEndDate = new Date(Number(actEndDate.substring(0,4)),Number(actEndDate.substring(5,7))-1,Number(actEndDate.substring(8,10)),0,0,0)
        item.actEndDateTime = actEndDateTime
        item.useTimeRange = useTimeRange
      })
      this.setData({
        orderList
      })
    }
  },
  renewOrder: async function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    orderitem.actStartDate = new Date(Number(orderitem.actStartDateString.substring(0,4)),Number(orderitem.actStartDateString.substring(5,7))-1,Number(orderitem.actStartDateString.substring(8,10)),0,0,0)
    
    orderitem.actEndDate = new Date(Number(orderitem.actEndDateString.substring(0,4)),Number(orderitem.actEndDateString.substring(5,7))-1,Number(orderitem.actEndDateString.substring(8,10)),0,0,0)
    
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
        request.post('/csTearoom/infoForWx',searchRoomParam).then(async (res)=>{
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

            if(merchantDetail.exStartTime){
              roomDetail.merchantExStartTime = merchantDetail.exStartTime
            }
    
            if(merchantDetail.exEndTime){
              roomDetail.merchantExEndTime = merchantDetail.exEndTime
            }

            const pickerTimeList = []
            const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5

            const orderEndTime = util.fixDate(orderitem.actEndDateString.trim() +" " +orderitem.actEndDateTime)
            console.log(orderitem)
            // 判断当前时间是否有订单
            const searchCurrentOrder = {
              tearoomId:roomDetail.id,
              currentTime:util.formatTimeJoin(orderEndTime,"-")
            }
            
            const currentOrderExist = await request.post('/csMerchantOrder/getOrderByCurrent',searchCurrentOrder)
            if(currentOrderExist && currentOrderExist.data && currentOrderExist.data.data
              && currentOrderExist.data.data!=orderitem.id){
              Toast('续单时段被预定')
              this.setData({
                showPickerPop:false,
                pickerTimeList:[]
              })
              return
            }


            // 续单最少1小时，需要预留0.5小时的保洁，也就是如果续单1个小时，需要后面1.5个小时
            const continueAtLeastDateTime = new Date(orderEndTime.valueOf() + 60 * 1000 * 60)

            const continueAtLeastYear = continueAtLeastDateTime.getFullYear(); 
            const continueAtLeastMonth = continueAtLeastDateTime.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
            const continueAtLeastDay = continueAtLeastDateTime.getDate(); //获取当前日(1-31)
            

            // 营业开始时间
            const merchantStartTime = roomDetail.merchantStartTime
            // 营业结束时间
            const merchantEndTime = roomDetail.merchantEndTime

            const merchantStartDate = util.fixDate(orderitem.actEndDateString + " "+ merchantStartTime)
            const merchantEndDate = util.fixDate(orderitem.actEndDateString + " "+ merchantEndTime)
            let merchantActEndDate = new Date(continueAtLeastYear, continueAtLeastMonth, continueAtLeastDay, merchantEndTime.split(":")[0], merchantEndTime.split(":")[1], 0)
            
            
            // 非营业时间
            const merchantExStartTime = roomDetail.merchantExStartTime
            const merchantExEndTime = roomDetail.merchantExEndTime

            let exStartDate = null
            let exEndDate = null
            if(merchantExStartTime && merchantExStartTime!='' && merchantExStartTime!=null){
              exStartDate = new Date(continueAtLeastYear, continueAtLeastMonth, continueAtLeastDay, merchantExStartTime.split(":")[0], merchantExStartTime.split(":")[1], 0)
            }
            if(merchantExEndTime && merchantExEndTime!='' && merchantExEndTime!=null){
              exEndDate =  new Date(continueAtLeastYear, continueAtLeastMonth, continueAtLeastDay, merchantExEndTime.split(":")[0], merchantExEndTime.split(":")[1], 0)
            }

            let nextDate  = new Date(orderitem.actEndDate.valueOf())
            nextDate.setDate(nextDate.getDate()+1);
            const nextYear = nextDate.getFullYear(); 
            const nextMonth = nextDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
            const nextDay = nextDate.getDate(); //获取当前日(1-31)

            if(continueAtLeastDateTime > merchantActEndDate){
              Toast('最小续单时长超过营业时间，无法续单')
              this.setData({
                showPickerPop:false,
                pickerTimeList:[]
              })
              return
            }

            // 有非营业时间
            if(exStartDate && exEndDate){
              if(continueAtLeastDateTime > exStartDate &&  continueAtLeastDateTime < exEndDate){
                Toast('最小续单时长超过营业时间，无法续单')
                this.setData({
                  showPickerPop:false,
                  pickerTimeList:[]
                })
                return
              }
              // 小于非营业时间的开始
              if(continueAtLeastDateTime < exStartDate){
                merchantActEndDate = exStartDate
              }else if(continueAtLeastDateTime >= exEndDate){
                // 大于非营业时间结束。 如果 营业开始时间为 00:00 营业结束时间字符串等于 24：00  表示全天营业
                if(merchantStartTime == '00:00' && merchantEndTime == '24:00'){
                  // 营业结束时间到下一个 非营业时间的开始
                  const exStartTimeArr = merchantExStartTime.split(":");
                  merchantActEndDate = new Date(nextYear, nextMonth, nextDay, exStartTimeArr[0], exStartTimeArr[1], 0);
                  crossNextDateFlag = true
                }
              }
            }
            
            const orderEndTimeStr = orderitem.actEndDateTime
            // 续单开始时间
            const beingTimeNum = Number(orderitem.actEndDate.getFullYear()+''+(orderitem.actEndDate.getMonth()+1).toString().padStart(2,'0')+''+orderitem.actEndDate.getDate().toString().padStart(2,'0')+ '' +orderitem.actEndDateTime.split(":")[0].padStart(2,'0')+''+orderitem.actEndDateTime.split(":")[1].padStart(2,'0'))
            // const beingTimeNum = Number(+)
            let nextEndTimeStr = null
            let nextEndDate = null

            const bookingDate = new Date(orderitem.actEndDate.getFullYear(),orderitem.actEndDate.getMonth(),orderitem.actEndDate.getDate())
            const searchBookingedObj = {
              tearoomId: roomDetail.id,
              orderDate: orderitem.actEndDateString
            }
            this.setData({
              roomDetail,
              bookingDate:bookingDate,
              bookingDateString: orderitem.actEndDateString,
              nextBookingDate: nextDate,
              nextBookingDateString:nextYear+'-'+(nextMonth+1).toString().padStart(2,'0')+'-'+nextDay.toString().padStart(2,'0'),
            },()=>{
              request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
                const orderTimeRange = res.data.data || null
                let ableTimeList =  util.getBookingAbleTimeList(bookingDate,orderTimeRange,roomDetail)
                const nextSearchBookingedObj = {
                  tearoomId:roomDetail.id,
                  orderDate: nextYear+'-'+(nextMonth+1).toString().padStart(2,'0')+'-'+nextDay.toString().padStart(2,'0')
                }
                request.post('/csMerchantOrder/getTimeRangeForWx',nextSearchBookingedObj).then((nextRes)=>{
                    const nextOrderTimeRange = nextRes.data.data || null
                    let nextAbleTimeList =  util.getBookingAbleTimeList(nextDate,nextOrderTimeRange,roomDetail)
                    if(nextAbleTimeList && nextAbleTimeList.length>0){
                      ableTimeList = ableTimeList.concat(nextAbleTimeList)
                    }
                    for(let i=0;i<ableTimeList.length;i++){
                      if(ableTimeList[i].bookingStatus == 0 && ableTimeList[i].bookingItemStartTimeNum >= beingTimeNum){
                        nextEndTimeStr = ableTimeList[i].bookingItemStartTime
                        nextEndDate = ableTimeList[i].bookingItemStartTimeDate
                        break;
                      }
                    }
                    // 下一个被预定的开始时间 没有的话 取营业结束时间
                    if(!nextEndTimeStr){
                      const nextEndHour = merchantActEndDate.getHours(); //获取当前小时数(0-23)
                      const nextEndMin = merchantActEndDate.getMinutes(); //获取当前分钟数(0-59)
                      nextEndTimeStr = nextEndHour.toString.padStart(2,'0')+":"+nextEndMin.toString.padStart(2,'0')
                      nextEndDate = merchantActEndDate
                    }

                    if(nextEndDate.getTime() !=merchantActEndDate.getTime()){
                      const tmpDate = new Date(nextEndDate.valueOf() - 60 * 1000 * app.globalData.cleanOderTime)
                      nextEndDate = tmpDate
                     }

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
                      bookAtOnceStartDate:orderitem.actEndDate,
                      bookAtOnceStartDateString:orderitem.actEndDateString,
                      bookAtOnceStartTime:orderitem.actEndDateTime,
                      bookAtOnceEndTime:nextEndTimeStr,
                      originOrderId:orderitem.id
                    })
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
    
    this.setData({
      showPickerPop:false
    },()=>{
      const searchBookingedObj = {
        tearoomId:_this.data.roomDetail.id,
        orderDate: _this.data.bookingDateString
      }
      let orderTimeRange = null
      request.post('/csMerchantOrder/getTimeRangeForWx',searchBookingedObj).then((res)=>{
        orderTimeRange = res.data.data || null
        let ableTimeList = util.getBookingAbleTimeList(_this.data.bookingDate,orderTimeRange,_this.data.roomDetail)
        const nextBookingedObj = {
          tearoomId:_this.data.roomDetail.id,
          orderDate:_this.data.nextBookingDateString
        }
        const nextBookingDate = _this.data.nextBookingDate
        let nextOrderTimeRange = null
        request.post('/csMerchantOrder/getTimeRangeForWx',nextBookingedObj).then((nextRes)=>{
          nextOrderTimeRange  = nextRes.data.data || null
          let nextAbleTimeList = util.getBookingAbleTimeList(nextBookingDate,nextOrderTimeRange,_this.data.roomDetail);
          if(nextAbleTimeList && nextAbleTimeList.length>0){
            ableTimeList = ableTimeList.concat(nextAbleTimeList)
          }
          _this.computeCanBookTime(_this.data.bookingDate,ableTimeList,value.timelength)
        })
      })
    })
  },
  computeCanBookTime:function(bookDate,ableTimeList,bookTimeLeng){
    const roomDetail = this.data.roomDetail
    const bookAtOnceStartDateString = this.data.bookAtOnceStartDateString
    const bookAtOnceStartTime = this.data.bookAtOnceStartTime
    const bookAtOnceDateTime = util.fixDate(this.data.bookingDateString+" "+ this.data.bookAtOnceStartTime)
    const bookTimeRange = []
    const step = roomDetail.timeRange?Number(roomDetail.timeRange):0.5
    let loopLength = bookTimeLeng / step
    if(loopLength > (ableTimeList.length)){
      loopLength = ableTimeList.length
    }


    const continueEndTime =  new Date(util.fixDate(this.data.bookingDateString+" "+ bookAtOnceStartTime).valueOf() + 60 * 1000 * 60 * (bookTimeLeng) )
    const canBookAtLeastBegin =  new Date(util.fixDate(this.data.bookingDateString+" "+ bookAtOnceStartTime).valueOf() + 60 * 1000 * 60 * (bookTimeLeng) )
    const merchantEndDate = new Date(canBookAtLeastBegin.getFullYear(),canBookAtLeastBegin.getMonth(),canBookAtLeastBegin.getDate(),Number(roomDetail.merchantEndTime.split(":")[0]),Number(roomDetail.merchantEndTime.split(":")[1]))//util.fixDate(.getFullYear+ " "+ roomDetail.merchantEndTime)
    
    if(canBookAtLeastBegin > merchantEndDate){
      Toast('续单时长超过营业时间，无法续单！')
      return
    }
    
    // 非营业时间
    const merchantExStartTime = roomDetail.merchantExStartTime
    const merchantExEndTime = roomDetail.merchantExEndTime

    let exStartDate = null
    let exEndDate = null
    if(merchantExStartTime && merchantExStartTime!='' && merchantExStartTime!=null){
      exStartDate = new Date(canBookAtLeastBegin.getFullYear(),canBookAtLeastBegin.getMonth(),canBookAtLeastBegin.getDate(),Number(merchantExStartTime.split(":")[0]),Number(merchantExStartTime.split(":")[1]));
    }
    if(merchantExEndTime && merchantExEndTime!='' && merchantExEndTime!=null){
      exEndDate = new Date(canBookAtLeastBegin.getFullYear(),canBookAtLeastBegin.getMonth(),canBookAtLeastBegin.getDate(),Number(merchantExEndTime.split(":")[0]),Number(merchantExEndTime.split(":")[1]));
    }

    // 有非营业时间
    if(exStartDate && exEndDate){
      if(canBookAtLeastBegin > exStartDate &&  canBookAtLeastBegin < exEndDate){
        Toast('续单时长超过营业时间，无法续单')
        return
      }
      if(bookAtOnceDateTime < exStartDate &&  canBookAtLeastBegin > exEndDate){
        Toast('续单时长超过营业时间，无法续单')
        return
      }
    }

    const canBookAtLeastBeginHour = canBookAtLeastBegin.getHours()
    const canBookAtLeastBeginMin = canBookAtLeastBegin.getMinutes()
    const canBookAtLeastBeginTimeNum = Number(canBookAtLeastBegin.getFullYear()+''+(canBookAtLeastBegin.getMonth()+1).toString().padStart(2,'0')+''+canBookAtLeastBegin.getDate().toString().padStart(2,'0')+ '' +canBookAtLeastBeginHour.toString().padStart(2,'0')+''+canBookAtLeastBeginMin.toString().padStart(2,'0'))
    const continueEndTimeNum = Number(continueEndTime.getFullYear()+''+(continueEndTime.getMonth()+1).toString().padStart(2,'0')+''+continueEndTime.getDate().toString().padStart(2,'0')+ '' +continueEndTime.getHours()+continueEndTime.getMinutes().toString().padStart(2,'0'))
    const bookingAtOnceStartTimeNum =  Number(bookAtOnceDateTime.getFullYear()+''+(bookAtOnceDateTime.getMonth()+1).toString().padStart(2,'0')+''+bookAtOnceDateTime.getDate().toString().padStart(2,'0')+ '' + bookAtOnceDateTime.getHours().toString().padStart(2,'0') + ""+bookAtOnceDateTime.getMinutes().toString().padStart(2,'0'))
    
    for(let i=0;i<ableTimeList.length;i++){
      if(ableTimeList[i].bookingItemStartTimeNum >= bookingAtOnceStartTimeNum 
        && ableTimeList[i].bookingItemEndTimeNum <= canBookAtLeastBeginTimeNum){
        if(ableTimeList[i].bookingStatus == 0){
          Toast('续单时段被预定，无法续单！')
          return
        }
      }
    }
    
    let firstNextStartTimeObj = null
    let startIndex = 999999999
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
    const bookActAtOnceStartTime = bookAtOnceDateTime.getHours().toString() + ":"+bookAtOnceDateTime.getMinutes().toString().padStart(2,'0');
    let extraMin = 0
    let firstTimeObj = {}
    if(bookAtOnceStartDateString!=firstNextStartTimeObj.bookingDateString ||
      bookActAtOnceStartTime != firstNextStartTimeObj.bookingItemStartTime){
      firstTimeObj.bookingDate = bookDate
      firstTimeObj.bookingDateString = bookDate.getFullYear()+'-'+(bookDate.getMonth()+1).toString().padStart(2,'0')+'-'+bookDate.getDate().toString().padStart(2,'0')
      firstTimeObj.bookingItemStartTime = bookActAtOnceStartTime
      firstTimeObj.bookingItemStartTimeDate = new Date(bookDate.getFullYear(), bookDate.getMonth(), bookDate.getDate(), Number(bookActAtOnceStartTime.split(':')[0]), Number(bookActAtOnceStartTime.split(':')[1]), 0);
      firstTimeObj.bookingItemStartTimeNum = Number(bookDate.getFullYear()+''+(bookDate.getMonth()+1).toString().padStart(2,'0')+''+bookDate.getDate().toString().padStart(2,'0')+ '' +bookActAtOnceStartTime.split(':')[0].toString().padStart(2,'0')+''+bookActAtOnceStartTime.split(':')[1].toString().padStart(2,'0'))
      firstTimeObj.bookingItemEndTime = firstNextStartTimeObj.bookingItemStartTime
      firstTimeObj.bookingItemEndTimeNum = firstNextStartTimeObj.bookingItemStartTimeNum
      firstTimeObj.bookingStatus = 1

      // firstTimeObj.bookingItemStartTime = bookAtOnceStartTime
      // firstTimeObj.bookingItemStartTimeNum = Number(bookAtOnceStartTime.split(':')[0]+''+bookAtOnceStartTime.split(':')[1])
      // firstTimeObj.bookingItemEndTime = firstNextStartTimeObj.bookingItemStartTime
      // firstTimeObj.bookingItemEndTimeNum = firstNextStartTimeObj.bookingItemStartTimeNum
      // firstTimeObj.bookingStatus = 1
      bookTimeRange.push(firstTimeObj)
      const nowYear = bookDate.getFullYear(); 
      const nowMonth = bookDate.getMonth(); //获取当前月份(0-11,0代表1月)         // 所以获取当前月份是myDate.getMonth()+1; 
      const nowDay = bookDate.getDate(); //获取当前日(1-31)
      const extraBeginDateTime =  new Date(nowYear,nowMonth,nowDay,Number(bookActAtOnceStartTime.split(":")[0]),Number(bookActAtOnceStartTime.split(":")[1]))
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

  computeBookingLength:async function(openFlag){
    const _this = this
    const startBookingTimeNum = this.data.startBookingTimeNum
    const endBookingTimeNum = this.data.endBookingTimeNum
    if(startBookingTimeNum>=0 && endBookingTimeNum >=0){
        const ableBookingTimeList =  this.data.ableBookingTimeList
        let bookingTimeStr = ""
        let bookingLengthCompare = 0
        let bookingLengthNum = 0
        let selectBookingTimeString = ""
        let nextSelectBookingTimeString = ""
        if(this.data.bookAtOnceExtraLength > 0 && this.data.bookAtOnceFirstObj){
          bookingTimeStr = this.data.bookAtOnceFirstObj.bookingItemStartTime+"-"+this.data.bookAtOnceFirstObj.bookingItemEndTime+',';
          selectBookingTimeString = this.data.bookAtOnceFirstObj.bookingItemStartTime+"-"+this.data.bookAtOnceFirstObj.bookingItemEndTime+',';
        }
        ableBookingTimeList.forEach(item=>{
          if(item.bookingStatus == 1 && item.bookingItemStartTimeNum >= startBookingTimeNum 
            && item.bookingItemEndTimeNum <=endBookingTimeNum){
              if(item.bookingDateString ==this.data.bookingDateString){
                selectBookingTimeString = selectBookingTimeString+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
              }
              if(item.bookingDateString ==this.data.nextBookingDateString){
                nextSelectBookingTimeString = nextSelectBookingTimeString+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
              }
              bookingTimeStr = bookingTimeStr+item.bookingItemStartTime+"-"+item.bookingItemEndTime+',';
          }
        })
        if(selectBookingTimeString && selectBookingTimeString!='' && bookingTimeStr.length >0){
          selectBookingTimeString = selectBookingTimeString.substring(0,selectBookingTimeString.length-1)
        }
        if(nextSelectBookingTimeString && nextSelectBookingTimeString!='' && nextSelectBookingTimeString.length >0){
          nextSelectBookingTimeString = nextSelectBookingTimeString.substring(0,nextSelectBookingTimeString.length-1)
        }


        // 判断订单结束时间 是否为 营业结束时间 以及 加上保洁时间后的 是否有订单。有就不允许预定
        //订单占用的开始时间 订单占用的结束时间 date
        let orderStartTime = null
        let orderEndTime = null
        let orderTimerageClean = null
        let nextOrderStartTime = null
        let nextOrderEndTime = null
        let nextOrderTimerageClean = null
        let judgeEndDate = null
        // 营业结束时间
        // 非营业时间
        let actEndTime = roomDetail.merchantEndTime
        // 判断预约结束时间点是否是营业结束时间点 或者是非营业时间点的开始。
        if(roomDetail.merchantExStartTime!=null && roomDetail.merchantExStartTime!=''){
          actEndTime = roomDetail.merchantExStartTime
        }

        // 当天选择了 下一天也选了 
        if(selectBookingTimeString && selectBookingTimeString!='' && nextSelectBookingTimeString && nextSelectBookingTimeString!=''){
          orderStartTime = util.fixDate(this.data.bookingDateString + " " +this.data.startBookingTime)
          orderEndTime = util.fixDate(this.data.bookingDateString + " " +"23:59")
          orderTimerageClean = selectBookingTimeString
          nextOrderStartTime = util.fixDate(this.data.nextBookingDateString + " " +"00:00")
          // 判断结束时间是否为营业结束时间。
          if(this.data.endBookingTime.padStart(5,'0') != actEndTime){
            const tmpEndDate = util.fixDate(this.data.nextBookingDateString + " " + this.data.endBookingTime)
            // 结束时间加上保洁时长
            nextOrderEndTime = new Date(tmpEndDate.valueOf() + 60 * 1000 * app.globalData.cleanOderTime)
            let cleanTmpHour = nextOrderEndTime.getHours();  
            const cleanTmpMin = nextOrderEndTime.getMinutes()
            nextOrderTimerageClean = nextSelectBookingTimeString+","+this.data.endBookingTime + "-"+cleanTmpHour+":"+cleanTmpMin.toString().padStart(2,'0')
          }else{
            nextOrderTimerageClean = nextSelectBookingTimeString
            nextOrderEndTime = util.fixDate(this.data.nextBookingDateString + " " + this.data.endBookingTime)
          }
          judgeEndDate = nextOrderEndTime
        }else if(selectBookingTimeString && selectBookingTimeString!='' && (!nextSelectBookingTimeString || nextSelectBookingTimeString=='')){
          // 当天选择了 下一天没有选择
          orderStartTime = util.fixDate(this.data.bookingDateString + " " +this.data.startBookingTime)
          // 判断结束时间是否为营业结束时间。
          if(this.data.endBookingTime.padStart(5,'0') != actEndTime){
            if(this.data.endBookingTime == '24:00'){
              nextOrderStartTime = util.fixDate(this.data.nextBookingDateString + " " +"00:00")
              nextOrderEndTime = new Date(nextOrderStartTime.valueOf() + 60 * 1000 * app.globalData.cleanOderTime)
              orderEndTime = util.fixDate(this.data.bookingDateString + " " +"23:59")
              orderTimerageClean = selectBookingTimeString
              let cleanTmpHour = nextOrderEndTime.getHours();  
              const cleanTmpMin = nextOrderEndTime.getMinutes()
              nextOrderTimerageClean = "0:00" + "-"+cleanTmpHour+":"+cleanTmpMin.toString().padStart(2,'0')
              judgeEndDate = nextOrderEndTime
            }else{
              const tmpEndDate = util.fixDate(this.data.bookingDateString + " " + this.data.endBookingTime)
              // 结束时间加上保洁时长
              orderEndTime = new Date(tmpEndDate.valueOf() + 60 * 1000 * app.globalData.cleanOderTime)
              let cleanTmpHour = orderEndTime.getHours();  
              const cleanTmpMin = orderEndTime.getMinutes()
              if(cleanTmpHour==0 && cleanTmpMin == 0){
                cleanTmpHour = 24
                orderEndTime = util.fixDate(this.data.bookingDateString + " " +"23:59")
              }
              
              orderTimerageClean = selectBookingTimeString+","+this.data.endBookingTime + "-"+cleanTmpHour+":"+cleanTmpMin.toString().padStart(2,'0')
              judgeEndDate = orderEndTime
            }           
          }else{
            if(this.data.endBookingTime == '24:00'){
              orderEndTime = util.fixDate(this.data.bookingDateString + " " +"23:59")
            }else{
              orderEndTime = util.fixDate(this.data.bookingDateString + " " +this.data.endBookingTime)
            }
            judgeEndDate = orderEndTime
            orderTimerageClean = selectBookingTimeString
          }
        }else if(nextSelectBookingTimeString && nextSelectBookingTimeString!='' && (!selectBookingTimeString || selectBookingTimeString=='')){
          // 当天没有选择了 下一天选择了
          orderStartTime = util.fixDate(this.data.nextBookingDateString + " " +this.data.startBookingTime)
          // 判断结束时间是否为营业结束时间。 
          // 不是营业结束时间 
          if(this.data.endBookingTime.padStart(5,'0') != actEndTime){
            if(this.data.endBookingTime == '24:00'){
              let nextNextDate = util.fixDate(this.data.nextBookingDateString + " " +"00:00")
              nextNextDate.setDate(nextNextDate.getDate()+1)
              nextOrderStartTime = nextNextDate
              nextOrderEndTime = new Date(nextOrderStartTime.valueOf() + 60 * 1000 * app.globalData.cleanOderTime)
              orderEndTime = util.fixDate(this.data.nextBookingDateString + " " +"23:59")
              orderTimerageClean = nextSelectBookingTimeString
              let cleanTmpHour = nextOrderEndTime.getHours();  
              const cleanTmpMin = nextOrderEndTime.getMinutes()
              nextOrderTimerageClean = "0:00" + "-"+cleanTmpHour+":"+cleanTmpMin.toString().padStart(2,'0')
              judgeEndDate = nextOrderEndTime
            }else{
              const tmpEndDate = util.fixDate(this.data.nextBookingDateString + " " + this.data.endBookingTime)
              // 结束时间加上保洁时长
              orderEndTime = new Date(tmpEndDate.valueOf() + 60 * 1000 * app.globalData.cleanOderTime)
              let cleanTmpHour = orderEndTime.getHours();  
              if(cleanTmpHour==0 && cleanTmpMin == 0){
                cleanTmpHour = 24
                orderEndTime = util.fixDate(this.data.nextBookingDateString + " " +"23:59")
              }
              const cleanTmpMin = orderEndTime.getMinutes()
              orderTimerageClean = nextSelectBookingTimeString+","+this.data.endBookingTime + "-"+cleanTmpHour+":"+cleanTmpMin.toString().padStart(2,'0')
              judgeEndDate = orderEndTime
            }
          }else{
            orderEndTime = util.fixDate(this.data.nextBookingDateString + " " + this.data.endBookingTime)
            orderTimerageClean = nextSelectBookingTimeString
            judgeEndDate = orderEndTime
          }
        }

        // 判断当前时间是否有订单 
        if(this.data.endBookingTime.padStart(5,'0') != actEndTime){
          const searchCurrentOrder = {
            tearoomId:roomDetail.id,
            currentTime:util.formatTimeJoin(judgeEndDate,"-")
          }
          const currentOrderExist = await request.post('/csMerchantOrder/getOrderByCurrent',searchCurrentOrder)
          if(currentOrderExist && currentOrderExist.data && currentOrderExist.data.data){
            const cleanTime = app.globalData.cleanOderTime
            Toast('需要预留'+cleanTime+'分钟保洁时间，请重新选择')
            return
          }
        }


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
          selectBookingTimeString:selectBookingTimeString,
          nextSelectBookingTimeString:nextSelectBookingTimeString,
          orderStartTime:util.formatTimeJoin(orderStartTime,"-"),// 订单开始时间 
          orderEndTime:util.formatTimeJoin(orderEndTime,"-"),// 订单结束时间 
          orderTimerageClean:orderTimerageClean,// 订单时间段 包含保洁时长
          nextOrderStartTime:util.formatTimeJoin(nextOrderStartTime,"-"),// 订单下一天开始时间 
          nextOrderEndTime:util.formatTimeJoin(nextOrderEndTime,"-"),// 订单下一天结束时间 
          nextOrderTimerageClean:nextOrderTimerageClean // 订单下一天时间段 包含保洁时长
        },()=>{
          if(openFlag){
              _this.confirmBooking()
          }
        })
    }else{
      this.setData({
        bookingLength:0,
        selectBookingTimeString:'',
        nextSelectBookingTimeString:'',
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
        let bookingDate = null
        let bookingDateString = null
        let nextBookingDate = null
        let nextBookingDateString = null
        let selectBookingTimeString = ""
        let nextSelectBookingTimeString = ""

        // 当天选择了
        if(this.data.selectBookingTimeString && this.data.selectBookingTimeString!=''){
          bookingDate = this.data.bookingDate
          bookingDateString = this.data.bookingDateString
          nextBookingDate = this.data.bookingDate
          nextBookingDateString = this.data.bookingDateString
          selectBookingTimeString = this.data.selectBookingTimeString
        }
        // 当天没选择
        if((!this.data.selectBookingTimeString || this.data.selectBookingTimeString ==null || 
          this.data.selectBookingTimeString=='')
          && this.data.nextSelectBookingTimeString && this.data.nextSelectBookingTimeString!=''){
          bookingDate = this.data.nextBookingDate
          bookingDateString = this.data.nextBookingDateString
          nextBookingDate = this.data.nextBookingDate
          nextBookingDateString = this.data.nextBookingDateString
          selectBookingTimeString = this.data.nextSelectBookingTimeString
        }

        if(this.data.nextSelectBookingTimeString && this.data.nextSelectBookingTimeString!=''){
          nextBookingDate = this.data.nextBookingDate
          nextBookingDateString = this.data.nextBookingDateString
          nextSelectBookingTimeString = this.data.nextSelectBookingTimeString
        }
        
        const dataTrans = {
          bookingTimeStr:selectBookingTimeString,
          nextSelectBookingTimeString:nextSelectBookingTimeString,
          bookingDate:bookingDate,
          bookingDateString:bookingDateString,
          nextBookingDate:nextBookingDate,
          nextBookingDateString:nextBookingDateString,
          startBookingTime:this.data.startBookingTime,
          startBookingTimeNum:this.data.startBookingTimeNum,
          endBookingTime:this.data.endBookingTime,
          endBookingTimeNum:this.data.endBookingTimeNum,
          bookingLength:this.data.bookingLength,
          bookAtOnceExtraLength:this.data.bookAtOnceExtraLength,
          bookAtOnceFirstObj:this.data.bookAtOnceFirstObj,
          originOrderId:this.data.originOrderId,
          orderStartTime:this.data.orderStartTime,// 订单开始时间 
          orderEndTime:this.data.orderEndTime,// 订单结束时间 
          orderTimerageClean:this.data.orderTimerageClean,// 订单时间段 包含保洁时长
          nextOrderStartTime:this.data.nextOrderStartTime,// 订单下一天开始时间 
          nextOrderEndTime:this.data.nextOrderEndTime,// 订单下一天结束时间 
          nextOrderTimerageClean:this.data.nextOrderTimerageClean, // 订单下一天时间段 包含保洁时长
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
