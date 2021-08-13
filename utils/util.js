const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/** html转义 **/
const unescape = html => {
  if (!html) {
    return ''
  }
  return html
    .replace(html ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "\'")
    .replace(/&amp;nbsp;/ig,'<br>')
    .replace(/&amp;lt;/ig,'<')
    .replace(/&amp;gt;/ig,'>')
}

module.exports = {
  formatTime,
  unescape: unescape
}
