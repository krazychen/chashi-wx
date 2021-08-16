// app.js
import request from './utils/request'
App({
  onLaunch() {
    
    this.getReleaseCityWx()
  },
  globalData: {
    userInfo: null,
    hasUserInfo:false,
    tabBarHeight: 50,
    cityList:[],
    mapKey:'FMXBZ-TXULW-2SVRL-RY734-IDFSF-2QFWF',
    paramConfigObj:{}
  },
  getReleaseCityWx:function(){
    request.get('/sysArea/getReleaseCityWx',null).then((res)=>{
      const dataList = res.data.data||[]
      this.globalData.cityList = dataList
    })
  }
})
