import globalVar from 'global'

class Request {
  constructor(parms) {
    this._withBaseURL = parms.withBaseURL
    this._baseUrl = parms.baseURL
  }

  /**
   * GET类型的网络请求
   */
  get(url, data) {
    return this.request(url, data,'GET')
  }

  /**
   * DELETE类型的网络请求
   */
  delete(url, data) {
    return this.request(url, data, 'DELETE')
  }

  /**
   * PUT类型的网络请求
   */
  put(url, data) {
    return this.request(url, data,'PUT')
  }

  /**
   * POST类型的网络请求
   */
  post(url, data) {
    return this.request(url, data, 'POST')
  }

  /**
   * 网络请求
   */
  request (url, data, method) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this._withBaseURL ? this._baseUrl + url : url,
        data: data,
        method: method,
        success: (res => {
          if (res.statusCode === 200) {
            //200: 服务端业务处理正常结束
            resolve(res)
          } else {
            //其它错误，提示用户错误信息
            reject(res)
          }
        }),
        fail: (res => {
          reject(res)
        })
      })
    })
  }
}

const request =new Request({
  baseURL:globalVar.system.severUrl,
  withBaseURL:true
})

module.exports = request
