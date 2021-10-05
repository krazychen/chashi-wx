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
      console.log(res)
      this.setData({
        orderDetail:res.data.data
      })
    })

  }
})
