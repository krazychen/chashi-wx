// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import util from '../../../utils/util'
import Toast from '../../../miniprogram_npm/@vant/weapp/toast/toast';

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    hasUserInfo:false,
    userInfo:null,
    memberCardList:[],
    currentCourselIndex:0,
    memberCardDetail:null
  },
  onLoad() {
    const _this = this
    const res = wx.getSystemInfoSync()
    this.setData({
      scrollHeight:res.windowHeight - app.globalData.tabBarHeight,
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    },()=>{
      _this.getMemberCardDetailByUserId()
    })
  },
  getMemberCardDetailByUserId:function(){
    request.get('/csMembercardOrder/getMemberCardForWx/'+this.data.userInfo.id,null).then((res)=>{
      const memberCardDetail = res.data.data || null
      const memberCardList = []
      
      if(memberCardDetail){
        memberCardDetail.cardname = memberCardDetail.membercardName
        if(memberCardDetail.useRights){
          memberCardDetail.useRights = util.unescape(memberCardDetail.useRights).replace(/<[^>]*>/g, '')
        }
        if(memberCardDetail.usageNotice){
          memberCardDetail.usageNotice = util.unescape(memberCardDetail.usageNotice).replace(/<[^>]*>/g, '')
        }
        memberCardList.push(memberCardDetail)
        this.setData({
          memberCardDetail,
          memberCardList
        })
      }else{
        this.getMemberCardInfo()
      }
    })
  },
  getMemberCardInfo:function(){
    request.post('/csMemberCard/getCsMemberCardListForWx',null).then((res)=>{
      const memberCardList = res.data.data||[]
      if(memberCardList && memberCardList.length>0){
        memberCardList.forEach(item=>{
          if(item.useRights){
            item.useRights = util.unescape(item.useRights).replace(/<[^>]*>/g, '')
          }
          if(item.usageNotice){
            item.usageNotice = util.unescape(item.usageNotice).replace(/<[^>]*>/g, '')
          }
        })
        this.setData({
          memberCardDetail:memberCardList[0]
        })
      }
      this.setData({
        memberCardList
      })
    })
  },
  changeCrouselIndex:function(e){
    const cardId = e.detail.currentItemId
    const memberCardList = this.data.memberCardList
    const _this =this
    if(cardId){
      memberCardList.forEach(item=>{
        if(item.id == cardId){
          _this.setData({
            memberCardDetail:item
          })
        }
      })
    }
  },
  buyMemberCard:function(){
    const _this = this;  
    const cardObj = {
      wxuserId: _this.data.userInfo.id,
      wxuserPhone:_this.data.userInfo.phoneNumber,
      openid:_this.data.userInfo.openid,
      membercardId:_this.data.memberCardDetail.id,
      membercardName:_this.data.memberCardDetail.cardname,
      orderPrice:0.01,
      validPeriod:_this.data.memberCardDetail.validPeriod,
    };
    request.get('/weixin/cardWxPay',cardObj).then((res)=>{
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
          Toast('付款成功')
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
