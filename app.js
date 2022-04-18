// app.js
import request from './utils/request'
App({
  onLaunch() {
    this.autoUpdate()
    this.getReleaseCityWx()
    this.getParamConfig()
    wx.showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },
  globalData: {
    userInfo: null,
    hasUserInfo:false,
    tabBarHeight: 50,
    cityList:[],
    mapKey:'FMXBZ-TXULW-2SVRL-RY734-IDFSF-2QFWF',
    paramConfigObj:{},
    recommendId:null,
    oneKeyTime:10,
    refundTimeLength:1,
    shopWxId:''
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
          if(item.configKey.startsWith("oneKeyTime")){
            if(item.configValue && Number(item.configValue)>0){
              this.globalData.oneKeyTime = item.configValue
            }
          }

          if(item.configKey.startsWith("wx_refund_time")){
            if(item.configValue && Number(item.configValue)>0){
              this.globalData.refundTimeLength = Number(item.configValue)
            }
          }

          if(item.configKey.startsWith("shop_wx_id")){
            if(item.configValue){
              this.globalData.shopWxId = item.configValue
            }
          }
          // if(item.configKey.startsWith("mapKey")){
          //   this.globalData.mapKey = item.configValue
          // }
        })
      }
      this.globalData.paramConfigObj = paramConfigObj
    })
  },

  autoUpdate: function() {

    var self = this

    // 获取小程序更新机制兼容

    if (wx.canIUse('getUpdateManager')) {

      const updateManager = wx.getUpdateManager()

      //1. 检查小程序是否有新版本发布

      updateManager.onCheckForUpdate(function(res) {

        // 请求完新版本信息的回调

        if (res.hasUpdate) {

          //2. 小程序有新版本，则静默下载新版本，做好更新准备

          updateManager.onUpdateReady(function() {

            updateManager.applyUpdate()

          })

          updateManager.onUpdateFailed(function() {

            // 新的版本下载失败

            wx.showModal({

              title: '已经有新版本了哟~',

              content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~',

            })

          })

        }

      })

    } else {

      // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示

      wx.showModal({

        title: '提示',

        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'

      })

    }

  }
})
