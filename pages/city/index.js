

const app = getApp()
import userBehavior from '../behavior/user-behavior'

Page({
  behaviors: [userBehavior],
  data: {
    cityList:[],
    currentCityName:''
  },

  onLoad: function (options) {
    if(app.globalData.cityList){
      this.setData({
        cityList:app.globalData.cityList
      })
    }
    const eventChannel = this.getOpenerEventChannel()
    // 真机需要判断 是否拿到数据
    new Promise((resolve, reject) => {
      eventChannel.on('sendCurrentCityName', function (data) {
        resolve(data)
      })
    }).then((res) => {
      this.setData({
        currentCityName:res
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