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
      }
    ],
    orderList:[]
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
        eventChannel.on('openOrderList', function (data) {
          resolve(data)
        })
      }).then((res) => {
        _this.setData({
          searchObj:{
            queryType:res,
            nameAphone:null,
            current:1,
            size:9999
          }
        },()=>{
          _this.getOrderList()
        })
      })
    })
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
          }else if(item.paymentStatus == 3){
            item.orderStatusName = '已取消' 
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
  }
})
