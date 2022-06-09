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
    memberCardDetail:null,
    showPayType:false,
    paymentType: 2,
    accountInfo:null,
    showOver:false
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
      _this.getAccountInfoByOpenId()
    })
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getAccountInfoByOpenId:function(){
    const _this = this
    if(this.data.hasUserInfo){
      request.get('/wxUser/infoForWx/'+this.data.userInfo.openid,null).then((res)=>{
        this.setData({
          accountInfo:res.data.data
        })
      })
    }
  },
  getMemberCardDetailByUserId:function(){
    request.get('/csMembercardOrder/getMemberCardForWx/'+this.data.userInfo.id,null).then((res)=>{
      const memberCardDetail = res.data.data || null
      const memberCardList = []
      
      if(memberCardDetail){
        memberCardDetail.cardname = memberCardDetail.membercardName
        if(memberCardDetail.useRights){
          memberCardDetail.useRights = util.unescape(memberCardDetail.useRights)
        }
        if(memberCardDetail.usageNotice){
          memberCardDetail.usageNotice = util.unescape(memberCardDetail.usageNotice)
        }
        if(memberCardDetail.startTime){
          memberCardDetail.startTime = memberCardDetail.startTime.substring(0,10)
        }
        if(memberCardDetail.endTime){
          memberCardDetail.endTime = memberCardDetail.endTime.substring(0,10)
        }
        memberCardDetail.ownerFlag = true
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
            item.useRights = util.unescape(item.useRights)
          }
          if(item.usageNotice){
            item.usageNotice = util.unescape(item.usageNotice)
          }
          item.ownerFlag = false
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
  toggleUseRights:function(e){
    const memberCardDetail  = e.currentTarget.dataset.item
    memberCardDetail.showUseRights = !memberCardDetail.showUseRights
    this.setData({
      memberCardDetail
    })
  },

  toggleUsageNotice:function(e){
    const memberCardDetail  = e.currentTarget.dataset.item
    memberCardDetail.showUsageNotice = !memberCardDetail.showUsageNotice
    this.setData({
      memberCardDetail
    })
  },

  openPayType:function(e){
    this.setData({
      showPayType:true
    })
  },
  onPayTypeClose:function(){
    this.setData({
      showPayType:false,
      showOver:false
    })
  },
  changePayType:function(e){
    const payType = e.currentTarget.dataset.paytype
    this.setData({
      paymentType:payType
    })
  },
  payForOrder:function(){
    if(this.data.hasUserInfo){
      this.setData({
        showOver:true
      })
      const paymentType = this.data.paymentType
      const _this = this
      const cardObj = {
        wxuserId: _this.data.userInfo.id,
        wxuserPhone:_this.data.userInfo.phoneNumber,
        openid:_this.data.userInfo.openid,
        membercardId:_this.data.memberCardDetail.id,
        membercardName:_this.data.memberCardDetail.cardname,
        orderPrice:_this.data.memberCardDetail.price,
        validPeriod:_this.data.memberCardDetail.validPeriod,
      };
      // 余额支付
      if(paymentType==1){
        if(_this.data.memberCardDetail.price > this.data.accountInfo.balance){
          Toast('余额不足')
          this.setData({
            showOver:false
          })
          return
        }
        request.post('/csMembercardOrder/saveMembercardOrder',cardObj).then((res)=>{
          if(res.data.code ===200){
            Toast({
              message: '付款成功',
              onClose: () => {
                this.setData({
                  showOver:false
                })
                wx.navigateBack({
                  delta: 0,
                })
              },
            })
          }else{
            Toast('付款失败')
            this.setData({
              showOver:false
            })
          }
        })
      }else{
        _this.buyMemberCard(cardObj)
      }
    }else{
      this.getUserProfile()
    }
  },

  buyMemberCard:function(cardObj){
    const _this = this;  
    // const cardObj = {
    //   wxuserId: _this.data.userInfo.id,
    //   wxuserPhone:_this.data.userInfo.phoneNumber,
    //   openid:_this.data.userInfo.openid,
    //   membercardId:_this.data.memberCardDetail.id,
    //   membercardName:_this.data.memberCardDetail.cardname,
    //   orderPrice:_this.data.memberCardDetail.price,
    //   validPeriod:_this.data.memberCardDetail.validPeriod,
    // };
    request.get('/weixin/cardWxPay',cardObj).then((res)=>{
      if(res.data.code ===200){
        _this.doWxPay(res.data); 
      }else{
        Toast('付款失败')
        this.setData({
          showOver:false
        })
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
              this.setData({
                showOver:false
              })
              wx.navigateBack({
                delta: 0,
              })
            },
          });  
        },  
        fail: function (error) {  
          const outTradeNo = param.data.outTradeNo
          // 取消支付
          if(error.errMsg=='requestPayment:fail cancel'){
            request.post('/weixin/cancelCardWxPay?outTradeNo='+outTradeNo,null).then((res)=>{
              this.setData({
                showOver:false
              })
            })
          }else{
            request.post('/weixin/failCardWxPay?outTradeNo='+outTradeNo+"&paymentMsg="+error.errMsg,null).then((res)=>{
              Toast('付款失败')
              this.setData({
                showOver:false
              })
            })
          }
        },  
        complete: function () {  
          // complete     
          console.log("pay complete")  
          this.setData({
            showOver:false
          })
        }  
      })
  }  
})
