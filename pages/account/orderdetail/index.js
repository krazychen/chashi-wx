// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';

Page({
  behaviors: [userBehavior],
  data: {
    hasUserInfo:false,
    userInfo:null,
    orderId:null,
    orderDetail:null
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
        eventChannel.on('openOrderDetail', function (data) {
          resolve(data)
        })
      }).then((res) => {
        _this.setData({
          orderId:res
        },()=>{
          _this.getOrderDetail()
        })
      })
    })
  },
  getOrderDetail:function(){
    request.get('/csMerchantOrder/infoForWx/'+this.data.orderId,null).then((res)=>{
      const orderDetail = res.data.data
      if(orderDetail.orderDate){
        orderDetail.orderDate = orderDetail.orderDate.substring(0,10)+" "
      }
      if(orderDetail.paymentType && orderDetail.paymentType ==1){
        orderDetail.paymentTypeName='余额支付'
      }else{
          orderDetail.paymentTypeName='微信支付'
      }
      if(orderDetail.orderTimerage){
         const orderRange = orderDetail.orderTimerage.split(',')
         if(orderRange.length>1){
           const startRange = orderRange[0].split('-')[0]
           const endRange = orderRange[orderRange.length-1].split('-')[1]
           orderDetail.orderTimerage = startRange +'-'+endRange
         }
      }
      if(orderDetail.paymentStatus == 0){
        orderDetail.orderStatusName = '待付款' 
      }else if(orderDetail.paymentStatus == 2 && orderDetail.usedStatus == 0){
        orderDetail.orderStatusName = '待使用' 
      }else if(orderDetail.paymentStatus == 2 && orderDetail.usedStatus == 1){
        orderDetail.orderStatusName = '已使用' 
      }else if(orderDetail.paymentStatus == 2 && orderDetail.usedStatus == 3){
        orderDetail.orderStatusName = '已完成' 
      }else if(orderDetail.paymentStatus == 3){
        orderDetail.orderStatusName = '已取消' 
      }else{
        orderDetail.orderStatusName = '已退款' 
      }

      this.setData({
        orderDetail
      })
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
  refundOrder:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const nowDate  = new Date()
    const currentHour = nowDate.getHours();  
    const currentMin = nowDate.getMinutes()
    if(orderitem.orderTimerage){
      const orderRange = orderitem.orderTimerage.split('-')
      const orderHour = orderRange[0].split(':')[0]
      const orderMin = orderRange[0].split(':')[1]
      if(currentHour > orderHour){
        Toast('已超过预定时间，无法退款')
        return
      }else if((currentHour==orderHour && parseInt(orderMin) - parseInt(currentMin)<=10 )){
        Toast('离预定时间不足10分钟，无法退款')
        return
      }
    }
    const orderRefundObj = {
      id:orderitem.id,
      orderPrice: orderitem.orderPrice,
      outTradeNo: orderitem.outTradeNo,
      paymentType: orderitem.paymentType,
      paymentStatus:orderitem.paymentStatus
    }
    const _this = this
    request.get('/weixin/refundOrderWxPay',orderRefundObj).then((res)=>{
      if(res.data.code ===200){
        Toast({
          message: '申请退款成功',
          onClose: () => {
            wx.navigateBack({
              delta: 0,
            })
          },
        });          
      }else{
        Toast('申请退款失败')
      }
    })
  },
  rePay:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const _this = this
    request.post('/weixin/orderReWxPay',orderitem).then((res)=>{
      if(res.data.code ===200){
        _this.doWxPay(res.data)
      }else{
        Toast('付款失败')
      }
    })
  },
  doWxPay:function(param){  
      const _this = this
    //小程序发起微信支付  
      wx.requestPayment({  
        timeStamp: param.data.timeStamp,
        nonceStr: param.data.nonceStr,  
        package: param.data.package,  
        signType: 'MD5',  
        paySign: param.data.paySign,  
        success: function (event) {
          Toast( '付款成功')
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
