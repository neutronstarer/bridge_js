;
(function () {
  const name = '<name>'
  const hash = require('md5')(name)
  const hubKey = 'hub_' + hash
  let hub = window[hubKey]
  if (hub != null) return hub
  hub = {}
  window[hubKey] = hub
  // this buffer cache messages waiting for query
  const messagesBuffer = []
  const sendToNative = (function () {
    try {
      if (window[hash].postMessage != null) { // android WebView
        return function (message) {
          try {
            window[hash].postMessage(JSON.stringify(message))
            return true
          } catch (e) {
            return false
          }
        }
      }
      if (window.webkit.messageHandlers[hash].postMessage != null) { // WKWebView
        return function (message) {
          try {
            window.webkit.messageHandlers[hash].postMessage(JSON.stringify(message))
            return true
          } catch (e) {
            return false
          }
        }
      }
    } catch (e) {
      return function (message) {
        // UIWebView WebView
        try {
          messagesBuffer.push(JSON.stringify(message))
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = 'https://' + hash + '/query'
          document.documentElement.appendChild(iframe)
          setTimeout(function () {
            document.documentElement.removeChild(iframe)
          }, 1)
          return true
        } catch (e) {
          return false
        }
      }
    }
  })()
  const winds = {}
  const sendToClient = (message) => {
    const { to } = message
    const wind = winds[to]
    if (wind == null) {
      return
    }
    const data = {}
    data[hash] = message
    wind.postMessage(data, '*')
  }
  // called by native
  hub.query = function () {
    const str = JSON.stringify(messagesBuffer)
    messagesBuffer.splice(0, messagesBuffer.length)
    return str
  }
  // called by native
  hub.transmit = function (str) {
    const message = JSON.parse(str)
    sendToClient(message)
  }
  window.addEventListener('message', function ({ source, data }) {
    try {
      const message = data[hash]
      if (message == null) {
        return
      }
      const { from = null, type = null } = message
      if (from == null) {
        throw new Error('from is null')
      }
      if (type === 'disconnect') {
        delete winds[from]
      }
      if (type === 'connect') {
        const wind = winds[from]
        if (wind == null) {
          winds[from] = source
        }
      }
      if (winds[from] == null) {
        throw new Error('unknown window')
      }
      sendToNative(message)
    } catch (e) {
      console.log(e)
    }
  })

  // hub did load
  const hubDidLoad = function () {
    // broadcast message to nested windows
    const broadcast = function (wd, message) {
      wd.postMessage(message, '*')
      const frames = wd.frames
      for (let i = 0, l = frames.length; i < l; i++) {
        broadcast(frames[i])
      }
    }
    const message = { type: 'load' }
    const data = {}
    data[hash] = message
    broadcast(window, data)
  }

  hubDidLoad()
  return hub
})()
