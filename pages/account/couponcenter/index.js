// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    couponList:[],
    disablegetbtn:false
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    this.getCsCouponListOfCouponCenter()
  },
  getCsCouponListOfCouponCenter:function(){
    request.post('/csCoupon/getCsCouponListOfCouponCenter',null).then((res)=>{
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
  getCoupon:function(e){
    if(this.data.disablegetbtn){
      return
    }
    const _this = this
    this.setData({
      disablegetbtn:true
    },()=>{
      const couponId = e.currentTarget.dataset.id
      const saveObj = {
        wxuserId:_this.data.userInfo.id,
        couponId
      }
      request.post('/csCouponReleased/saveCouponForCouponCenter',saveObj).then((res)=>{
        if(res.data.success){
          Toast({
              message: '领取成功',
              onClose: () => {
                _this.setData({
                  disablegetbtn:false
                })
              },
            });
        }else{
          Toast({
            message: '领取失败',
            onClose: () => {
              _this.setData({
                disablegetbtn:false
              })
            },
          });
        }
      })
    })
  }
})
