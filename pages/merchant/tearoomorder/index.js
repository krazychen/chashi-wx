// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast'
import util from '../../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    orderDetail:null,
    showPop:false,
    couponList:[],
    checkCouponItem:null,
    accountInfo:null,
    orderPayObj:null,
    showPayType:false,
    paymentType: 2
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('openRoomOrder', function (data) {
        resolve(data)
      })
    }).then((res) => {
      if(res.usageNotice){
        res.usageNotice = util.unescape(res.usageNotice).replace(/<[^>]*>/g, '')
      }
      this.setData({
        orderDetail:res
      })
    })
    this.getCouponListByUserId()
    this.getAccountInfoByOpenId()
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getCouponListByUserId:function(){
    request.get('/csCouponReleased/getCouponForWx/'+this.data.userInfo.id,null).then((res)=>{
      const couponList = res.data.data
      if(couponList && couponList.length>0){
        couponList.forEach(item=>{
          if(item.startTime){
            item.startTime = item.startTime.substring(0,10)
          }
          if(item.endTime){
            item.endTime = item.endTime.substring(0,10)
          }
        })
      }
      this.setData({
        couponList
      })
    })
  },
  getAccountInfoByOpenId:function(){
    const _this = this
    if(this.data.hasUserInfo){
      request.get('/wxUser/infoForWx/'+this.data.userInfo.openid,null).then((res)=>{
        this.setData({
          accountInfo:res.data.data
        },()=>{
          _this.computeOrderPrice()
        })
      })
    }
  },
  onPopClose:function(){
    this.setData({
      showPop:false
    })
  },
  openPop:function(e){
    this.setData({
      showPop:true
    })
  },
  checkCoupon:function(e){
    const couponItem = e.currentTarget.dataset.item
    const orderPayObj = this.data.orderPayObj
    if(couponItem.fullAmount > orderPayObj.orderPrice){
      Toast("该优惠券满"+couponItem.fullAmount+"可用")
    }else{
      this.setData({
        checkCouponItem:couponItem,
        showPop:false
      })
    }
  },
  unCheckCoupon:function(){
    this.setData({
      checkCouponItem:null,
      showPop:false
    })
  },
  computeOrderPrice(){
     const orderPayObj = {}
     const orderDetail = this.data.orderDetail
     const accountInfo = this.data.accountInfo
     orderPayObj.merchantId = orderDetail.merchantId
     orderPayObj.tearoomId = orderDetail.id
     orderPayObj.roomName = orderDetail.roomName
     orderPayObj.wxuserId = accountInfo.id
     orderPayObj.wxuserPhone = accountInfo.phoneNumber
     orderPayObj.openid = accountInfo.openid
     orderPayObj.orderDate = orderDetail.bookingDateString
     orderPayObj.orderTimerage = orderDetail.bookingTimeStr
     orderPayObj.orderOriginTimenum = orderDetail.bookingLength
     orderPayObj.orderUnitOriginPrice = orderDetail.hoursAmount
     orderPayObj.orderOriginPrice = orderDetail.hoursAmount * orderDetail.bookingLength
    if(accountInfo.csMembercardOrderQueryVo){
      orderPayObj.membercardOrderId = accountInfo.csMembercardOrderQueryVo.membercardId
      orderPayObj.orderUnitPrice = orderDetail.menberAmount
      orderPayObj.orderTimenum = 0
      orderPayObj.orderPrice = orderPayObj.orderUnitPrice * orderDetail.bookingLength
      // 如果有会员卡，并且使用优惠时长， 则增加 orderMbTimenum, orderTimenum
      if (false) {
        if (accountInfo.csMembercardOrderQueryVo.restDiscountTime && accountInfo.csMembercardOrderQueryVo.restDiscountTime > orderPayObj.orderOriginTimenum) {
          orderPayObj.orderTimenum = 0
          orderPayObj.orderMbTimenum = orderPayObj.orderOriginTimenum
          orderPayObj.orderPrice = 0
        } else {
          orderPayObj.orderTimenum = orderPayObj.orderOriginTimenum - accountInfo.csMembercardOrderQueryVo.restDiscountTime
          orderPayObj.orderMbTimenum = accountInfo.csMembercardOrderQueryVo.restDiscountTime
          orderPayObj.orderPrice = orderPayObj.orderTimenum * orderPayObj.orderUnitPrice
        }
      } else {
        orderPayObj.orderMbTimenum = 0
      }
      // 如果有会员卡，并且使用优惠金额， 则增加 orderMbAmount
      if (false) {
        const tempOrderPrice = orderPayObj.orderTimenum * orderPayObj.orderUnitPrice
        // 因为有可能优惠时长后，时长为0，则这时候不需要使用优惠金额了
        if (tempOrderPrice === 0) {
          orderPayObj.orderMbAmount = 0
          orderPayObj.orderPrice = 0
        } else {
          if (accountInfo.csMembercardOrderQueryVo.restDiscountPrice && accountInfo.csMembercardOrderQueryVo.restDiscountPrice > tempOrderPrice) {
            orderPayObj.orderMbAmount = tempOrderPrice
            orderPayObj.orderPrice = 0
          } else {
            orderPayObj.orderMbAmount = tempOrderPrice
            orderPayObj.orderPrice = tempOrderPrice - accountInfo.csMembercardOrderQueryVo.restDiscountPrice
          }
        }
      }
    }else{
      orderPayObj.orderUnitPrice = 0
      orderPayObj.orderTimenum = 0
      orderPayObj.orderPrice = orderPayObj.orderOriginPrice
    }
    this.setData({
      orderPayObj
    })
  },
  openPayType:function(e){
    this.setData({
      showPayType:true
    })
  },
  onPayTypeClose:function(){
    this.setData({
      showPayType:false
    })
  },
  changePayType:function(e){
    const payType = e.currentTarget.dataset.paytype
    this.setData({
      paymentType:payType
    })
  },
  payForOrder:function(){
    const orderPayObj = this.data.orderPayObj
    const checkCouponItem = this.data.checkCouponItem
    // 如果使用优惠卷，需要增加couponReleasedId, orderCpAmount, 需要控制满X才能使用优惠卷
    if (checkCouponItem) {
      orderPayObj.couponReleasedId = checkCouponItem.id
      orderPayObj.orderCpAmount = checkCouponItem.reductionAmount
      orderPayObj.orderPrice = orderPayObj.orderPrice - orderPayObj.orderCpAmount
    } else {
      orderPayObj.orderCpAmount = 0
    }
    orderPayObj.paymentType = this.data.paymentType
    const _this = this
    // 余额支付
    if(orderPayObj.paymentType==1){
      if(orderPayObj.orderPrice > this.data.accountInfo.balance){
        Toast('余额不足')
        return
      }
      request.post('/csMerchantOrder/addCsMerchantOrderForWx',orderPayObj).then((res)=>{
        if(res.data.code ===200){
          Toast('付款成功')
        }else{
          Toast('付款失败')
        }
      })
    }else{
      request.get('/weixin/orderWxPay',orderPayObj).then((res)=>{
        if(res.data.code ===200){
          _this.doWxPay(res.data); 
        }else{
          Toast('付款失败')
        }
      })
    }
  },
  doWxPay:function(param){  
      //小程序发起微信支付  
      wx.requestPayment({  
        timeStamp: param.data.timeStamp,
        nonceStr: param.data.nonceStr,  
        package: param.data.package,  
        signType: 'MD5',  
        paySign: param.data.paySign,  
        success: function (event) {
          Toast({
            message: '付款成功',
            onClose: () => {
              wx.navigateBack({
                delta: 0,
              })
            },
          });  
        },  
        fail: function (error) {
          const id = param.data.id
          // // 取消支付
          if(error.errMsg=='requestPayment:fail cancel'){
            request.post('/weixin/cancelOrderWxPay?id='+id,null).then((res)=>{
            })
          }else{
            request.post('/weixin/failOrderWxPay?id='+id+"&paymentMsg="+error.errMsg,null).then((res)=>{
              Toast('付款失败')
            })
          }
        },  
        complete: function () {  
          // complete     
          console.log("pay complete")  
        }  
      })
  }
})
