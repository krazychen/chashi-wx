// index.js
// 获取应用实例
const app = getApp()
import request from '../../../utils/request'
import userBehavior from '../../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    scrollHeight:null,
    merchantId:null,
    merchantDetail:null,
    currentCourselIndex:1
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
        merchantId:res
      },()=>{
        _this.getMerchantDetailById()
      })
    })
  },
  getMerchantDetailById:function(){
    request.get('/csMerchant/infoForWx/'+this.data.merchantId,null).then((res)=>{
      const merchantDetail = res.data.data
      if(merchantDetail){
        if(merchantDetail.carouselUrlValue){
          const carouselUrlArray = merchantDetail.carouselUrlValue.split(",")
          merchantDetail.carouselUrlArray = carouselUrlArray
        }else{
          merchantDetail.carouselUrlArray = [merchantDetail.logoUrlValue]
        }
      }
      this.setData({
        merchantDetail:merchantDetail
      })
    })
  },
  changeCrouselIndex:function(e){
    this.setData({
      currentCourselIndex:e.detail.current+1
    })
  }
})
