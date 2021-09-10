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
      size:999
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
      _this.getOrderList()
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
            item.orderDate = item.orderDate.substring(0,10)
          }
        })
      }
      this.setData({
        orderList
      })
    })
  }

})
