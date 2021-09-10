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
    ]
  },
  onLoad() {
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getOrderList(){
    request.post('/csMerchantOrder/getCsMerchantOrderListForWx',null).then((res)=>{
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
  }

})
