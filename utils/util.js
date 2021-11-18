const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/** html转义 **/
const unescape = html => {
  if (!html) {
    return ''
  }
  return html
    .replace(html ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "\'")
    .replace(/&amp;nbsp;/ig,'<br>')
    .replace(/&amp;lt;/ig,'<')
    .replace(/&amp;gt;/ig,'>')
}

const getBookingAbleTimeList = function(bookingDate,bookedTime,roomDetail){
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
  return ableTimeList
}

const formatDecimal = function(num, decimal,compareNum) {
  num = num.toString()
  let index = num.indexOf('.')
  if (index !== -1) {
    if(parseInt(num.substring(index+1, decimal + index + 1))>=compareNum){
      num = num.substring(0, decimal + index + 1)
    }else{
      if(decimal>1){
        num = num.substring(0, decimal + index )
      }else{
        num = num.substring(0)
      }
    }
  } else {
    num = num.substring(0)
  }
  return parseFloat(num).toFixed(decimal)
}

module.exports = {
  formatTime,
  unescape: unescape,
  getBookingAbleTimeList:getBookingAbleTimeList,
  formatDecimal
}
