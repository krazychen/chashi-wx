// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'
import util from '../../../utils/util'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    merchantTrans:null,
    merchantDetail:null,
    currentCourselIndex:1,
    hasUserInfo:false,
    userInfo:null
  },
  onLoad() {
    const _this = this;
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('openMerchantDetail', function (data) {
        resolve(data)
      })
    }).then((res) => {
      this.setData({
        merchantTrans:res
      },()=>{
        _this.getMerchantDetailById()
      })
    })
  },
  onShow(){
    this.setData({
      hasUserInfo:app.globalData.hasUserInfo,
      userInfo:app.globalData.userInfo
    })
  },
  getMerchantDetailById:function(){
    request.get('/csMerchant/infoForWx/'+this.data.merchantTrans.id,null).then((res)=>{
      const merchantDetail = res.data.data
      if(merchantDetail){
        if(merchantDetail.carouselUrlValue){
          const carouselUrlArray = merchantDetail.carouselUrlValue.split(",")
          merchantDetail.carouselUrlArray = carouselUrlArray
        }else{
          merchantDetail.carouselUrlArray = [merchantDetail.logoUrlValue]
        }
        if(merchantDetail.facilitiesName){
          const facilitiesNameArray = merchantDetail.facilitiesName.split(",")
          merchantDetail.facilitiesNameArray = facilitiesNameArray
        }else{
          merchantDetail.facilitiesNameArray = []
        }
        if(merchantDetail.usageNotice){
          merchantDetail.usageNotice = util.unescape(merchantDetail.usageNotice).replace(/<[^>]*>/g, '')
        }

        if(merchantDetail.tearoomList && merchantDetail.tearoomList.length>0){
          let hoursAmount = 9999999
          let buyRecord = 0
          merchantDetail.tearoomList.forEach(item=>{
            if(item.hoursAmount < hoursAmount){
              hoursAmount = item.hoursAmount
            }
            if(!item.buyRecord){
              item.buyRecord = 0
            }
            buyRecord = buyRecord + item.buyRecord
          });
          if(hoursAmount == 9999999){
            hoursAmount = 0
          }
          merchantDetail.hoursAmount = hoursAmount
          merchantDetail.buyRecord = buyRecord
        }else{
          merchantDetail.hoursAmount = 0
          merchantDetail.buyRecord = 0
        }
      }

      merchantDetail.merchantDistance = this.data.merchantTrans.merchantDistance
      this.setData({
        merchantDetail:merchantDetail
      })
    })
  },
  changeCrouselIndex:function(e){
    this.setData({
      currentCourselIndex:e.detail.current+1
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
  openRoomDetail:function(e){
    const roomId = e.currentTarget.dataset.id
    const merchant = e.currentTarget.dataset.merchant
    const dataTrans = {
      id:roomId,
      merchantDistance:merchant.merchantDistance,
      address:merchant.address,
      usageNotice:merchant.usageNotice,
      merchantStartTime:merchant.startTime,
      merchantEndTime:merchant.endTime,
      merchantLongitude:merchant.longitude,
      merchantLatitude:merchant.latitude
    }
    wx.navigateTo({
      url: '/pages/merchant/tearoomdetail/index',
      success: function(res) {
        res.eventChannel.emit('openRoomDetail', dataTrans)
      }
    })
  }
})
