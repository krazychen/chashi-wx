

const app = getApp()
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    cityList:[]
  },

  onLoad: function (options) {
    if(app.globalData.cityList){
      this.setData({
        cityList:app.globalData.cityList
      })
    }
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