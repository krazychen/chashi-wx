Component({
  data: {
  active: 0,
  showBar: true,
  list: [
    {
      "url": "/pages/index/index",
      "icon": "/static/image/shouye_icon.png",
      "iconSelected": "/static/image/shouye_yes_icon.png",
      "text": "首页"
    },
    {
      "url": "/pages/merchant/index",
      "icon": "/static/image/jiangjie_icon.png",
      "iconSelected": "/static/image/jiangjie_yes_icon.png",
      "text": "预定茶室"
    },
    {
      "url": "/pages/other/index",
      "icon": "/static/image/wenzhang_icon.png",
      "iconSelected": "/static/image/wenzhang_yes_icon.png",
      "text": "荣景商城"
    },
    {
      "url": "/pages/account/index",
      "icon": "/static/image/wode_icon.png",
      "iconSelected": "/static/image/wode_yes_icon.png",
      "text": "个人中心"
    }
  ]
  },
  methods: {
   onChange(e) {
     if(e.detail==2){
      wx.navigateToMiniProgram({
        appId: 'wx93c826738d8ae8b9'
      })
     }else{
      this.setData({ active: e.detail });
      wx.switchTab({
        url: this.data.list[e.detail].url
      });
     }
      
   },
   hideTabBar(){
      this.setData({
        　showBar: false
       });
   },
   showTabBar(){
    this.setData({
      　 showBar: true
     });
 },
   init() {
       const page = getCurrentPages().pop();
       this.setData({
      　  active: this.data.list.findIndex(item => item.url === `/${page.route}`)
       });
      }
   }
});