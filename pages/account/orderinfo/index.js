// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';
import Dialog from '../../../miniprogram_npm/@vant/weapp/dialog/dialog';
import util from '../../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    hasUserInfo:false,
    userInfo:null,
    accountInfo:null,
    searchObj:{
      queryType:1,
      nameAphone:null,
      current:1,
      size:9999
    },
    orderType:[
      {
        queryType:1,
        queryTypeName:'全部'
      },
      {
        queryType:2,
        queryTypeName:'待付款'
      },
      {
        queryType:3,
        queryTypeName:'待使用'
      },
      {
        queryType:4,
        queryTypeName:'已使用'
      },
      {
        queryType:5,
        queryTypeName:'已完成'
      },
      {
        queryType:6,
        queryTypeName:'已取消'
      },
      {
        queryType:7,
        queryTypeName:'已退款'
      },
      {
        queryType:8,
        queryTypeName:'已失效'
      }
    ],
    orderList:[],
    queryFrom:'accountInfo',
    oneKeyTime:10
  },
  onLoad() {
    const _this = this
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo,
      oneKeyTime:app.globalData.oneKeyTime||10
    },()=>{
      const eventChannel = _this.getOpenerEventChannel()
      // 真机需要判断 是否拿到数据
      new Promise((resolve, reject) => {
        eventChannel.on('openOrderList', function (data) {
          resolve(data)
        })
      }).then((res) => {
        _this.setData({
          searchObj:{
            queryType:res.queryType,
            nameAphone:null,
            current:1,
            size:9999
          },
          queryFrom:res.queryFrom
        },()=>{
          _this.getOrderList()
        })
      })
    })
  },
  onUnload(){
    if(this.data.queryFrom=='tearoom'){
      wx.switchTab({
        url: '/pages/merchant/index'
      })
    }else{
      wx.navigateBack({
        delta: 1
      })
    }
  },
  getOrderList(){
    const searchObj = this.data.searchObj
    searchObj.nameAphone = this.data.userInfo.phoneNumber
    request.post('/csMerchantOrder/getCsMerchantOrderListForWx',searchObj).then((res)=>{
      const orderList = res.data.data.records || []
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

          if(item.paymentStatus == 0){
             item.orderStatusName = '待付款' 
          }else if(item.paymentStatus == 2 && item.usedStatus == 0){
            item.orderStatusName = '待使用' 
          }else if(item.paymentStatus == 2 && item.usedStatus == 1){
            item.orderStatusName = '已使用' 
          }else if(item.paymentStatus == 2 && item.usedStatus == 3){
            item.orderStatusName = '已完成' 
          }else if(item.paymentStatus == 3 || item.paymentStatus == 4){
            item.orderStatusName = '已取消' 
          }else if(item.paymentStatus == 2 && item.usedStatus == 2){
            item.orderStatusName = '已失效' 
          }else{
            item.orderStatusName = '已退款' 
          }
        })
      }
      this.setData({
        orderList
      })
    })
  },
  searchByQueryType:function(e){
    const queryTypeItem = e.currentTarget.dataset.querytype
    const searchObj = this.data.searchObj
    searchObj.queryType = queryTypeItem.queryType
    const _this = this
    this.setData({
      searchObj
    },()=>{
      _this.getOrderList()
    })
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
        Toast('申请退款成功')
        _this.getOrderList()
      }else{
        Toast('申请退款失败')
        _this.getOrderList()
      }
    })
  },
  openOrderDetail:function(e){
    const orderid = e.currentTarget.dataset.orderid
    if(this.data.hasUserInfo){
      wx.navigateTo({
        url: '/pages/account/orderdetail/index',
        success: function(res) {
          res.eventChannel.emit('openOrderDetail', orderid)
        }
      })
    }else{
      this.getUserProfile()
    }
  },
  rePay:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const _this = this
    request.post('/weixin/orderReWxPay',orderitem).then((res)=>{
      if(res.data.code ===200){
        _this.doWxPay(res.data)
      }else{
        Toast('付款失败')
        _this.getOrderList()
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
          _this.getOrderList()  
        }  
      })
  },
  showDoorPwd:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const orderRange = orderitem.orderTimerage.split(',')
    const orderDateTimeStr = orderitem.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[0]+":00"
    const orderDateTime = util.fixDate(orderDateTimeStr)
    const nowDate = new Date(new Date().valueOf() + 60 * 1000 * 5)
    if(nowDate < orderDateTime){
      Toast('只能在订单使用前5分钟查看密码')
      return
    }
    request.get('/csMerchantOrder/lockKeyForWx/'+orderitem.id,null).then((res)=>{
      if(res.data.code == 200){
        Dialog.alert({
          message: res.data.data,
          theme: 'round-button',
        }).then(() => {
          // on close
        });
      }else{
        Toast('获取开锁密码失败')
      }
    })
  },
  openDoor:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const orderRange = orderitem.orderTimerage.split(',')
    const orderDateTimeStr = orderitem.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[0]+":00"
    const orderDateTime = util.fixDate(orderDateTimeStr)
    const oneKeyTime = Number(this.data.oneKeyTime)
    const nowDate = new Date(new Date().valueOf() + 60 * 1000 * oneKeyTime)
    const nowEndDate = new Date()
    const orderDateEndTimeStr = orderitem.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[1]+":00"
    const orderDateEndTime = util.fixDate(orderDateEndTimeStr)
    if(nowDate < orderDateTime){
      Toast('只能在订单使用前'+oneKeyTime+'分钟一键开锁')
      return
    }
    if(nowEndDate > orderDateEndTime){
      Toast('订单已完成')
      return
    }

    const lockPostObj={
      id:orderitem.id,
      merchantId:orderitem.merchantId,
      tearoomId:orderitem.tearoomId
    }
    request.post('/csMerchantOrder/openLock',lockPostObj).then((res)=>{
      if(res.data.code == 200){
        Toast(res.data.data)
      }else{
        Toast('开锁失败')
      }
      this.getOrderList()
    })
  },
  openInsideDoor:function(e){
    const orderitem = e.currentTarget.dataset.orderitem
    const orderRange = orderitem.orderTimerage.split(',')
    const orderDateTimeStr = orderitem.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[0]+":00"
    const orderDateTime = util.fixDate(orderDateTimeStr)
    const oneKeyTime = Number(this.data.oneKeyTime)
    const nowDate = new Date(new Date().valueOf() + 60 * 1000 * oneKeyTime)
    const nowEndDate = new Date()
    const orderDateEndTimeStr = orderitem.orderDate.substring(0,10) + " "+ orderRange[0].split('-')[1]+":00"
    const orderDateEndTime = util.fixDate(orderDateEndTimeStr)
    if(nowDate < orderDateTime){
      Toast('只能在订单使用前'+oneKeyTime+'分钟一键开锁')
      return
    }
    if(nowEndDate > orderDateEndTime){
      Toast('订单已完成')
      return
    }

    const lockPostObj={
      id:orderitem.id,
      merchantId:orderitem.merchantId,
      tearoomId:orderitem.tearoomId
    }
    request.post('/csMerchantOrder/openRoomLock',lockPostObj).then((res)=>{
      if(res.data.code == 200){
        Toast(res.data.data)
      }else{
        Toast('开锁失败')
      }
      this.getOrderList()
    })
  }
})
