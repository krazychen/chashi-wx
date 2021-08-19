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
    rechargeSettingList: [],
    rechargeObj:{
      rechargeAmount:0,
      rechargeGived:0
    }
  },
  onLoad() {
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
    this.getSettingListForWx()
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getSettingListForWx:function(){
    request.post('/csRechargeSetting/getSettingListForWx',{}).then((res)=>{
      const rechargeSettingList = res.data.data||[]
      this.setData({
        rechargeSettingList
      })
    })
  },
  setRechargeValue:function(e){
    const rechargeObj = e.currentTarget.dataset.rechargeitem
    this.setData({
      rechargeObj:{
        rechargeAmount:rechargeObj.rechargeAmount,
        rechargeGived:rechargeObj.rechargeGived
      }
    })
  },
  onChangeRecharge:function(e){
    this.setData({
      rechargeObj:{
        rechargeAmount:e.detail,
        rechargeGived:0
      }
    })
  },
  rechargeTopup:function(e){
    const _this = this;  
    const csRechargeRecord = {
      wxuserId: _this.data.userInfo.id,
      wxuserPhone:_this.data.userInfo.phoneNumber,
      openid:_this.data.userInfo.openid,
      rechargeAmount:_this.data.rechargeObj.rechargeAmount,
      rechargeGived:_this.data.rechargeObj.rechargeGived
    };
    request.get('/weixin/rechargeWxPay',csRechargeRecord).then((res)=>{
      if(res.data.code ===200){
        _this.doWxPay(res.data); 
      }else{
        Toast('付款失败')
      }
    })
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
          Toast('付款失败')
        },  
        complete: function () {  
          // complete     
          console.log("pay complete")  
        }  
      })
  }  
})
