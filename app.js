// app.js
import request from './utils/request'
App({
  onLaunch() {
    this.getReleaseCityWx()
    this.getParamConfig()
  },
  globalData: {
    userInfo: null,
    hasUserInfo:false,
    tabBarHeight: 50,
    cityList:[],
    mapKey:'FMXBZ-TXULW-2SVRL-RY734-IDFSF-2QFWF',
    paramConfigObj:{},
    recommendId:null
  },
  getReleaseCityWx:function(){
    request.get('/sysArea/getReleaseCityWx',null).then((res)=>{
      const dataList = res.data.data||[]
      this.globalData.cityList = dataList
    })
  },
  getParamConfig:function(){
    request.get('/sysConfig/getAllConfigDataCache',{}).then((res)=>{
      const paramConfigList = res.data.data||[]
      const paramConfigObj = {}
      if(paramConfigList.length>0){
        paramConfigList.forEach((item)=>{
          if(item.configKey.startsWith("wx_homepage_static")){
            paramConfigObj[item.configKey] = item.configValue
          }
          // if(item.configKey.startsWith("mapKey")){
          //   this.globalData.mapKey = item.configValue
          // }
        })
      }
      this.globalData.paramConfigObj = paramConfigObj
    })
  }
})
