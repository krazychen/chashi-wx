

const app = getApp()
import request from '../../utils/request'
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    cityList:[]
  },

  onLoad: function (options) {
    this.getReleaseCityWx()
  },
  getReleaseCityWx:function(){
    request.get('/sysArea/getReleaseCityWx',null).then((res)=>{
      const dataList = res.data.data||[]
      console.log(dataList)
      this.setData({
        cityList:dataList
      })
    })
  },
  changeCityName:function(e){
    const city = e.target.dataset.city
    wx.navigateBack({
      complete:()=>{
        const eventChannel = this.getOpenerEventChannel()
        eventChannel.emit('changeCity',city);
      }
    })
  }
})