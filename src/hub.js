
;(function (name) {
  const hubKey = 'hub.' + name
  let hub = window[hubKey]
  if (hub != null) return hub
  hub = {}
  window[hubKey] = hub
  // cache messages waiting for query
  const messages = []
  const sendToNative = (function () {
    try {
      if (window[name].postMessage != null) { // android WebView
        return function (message) {
          try {
            window[name].postMessage(JSON.stringify(message))
            return true
          } catch (e) {
            return false
          }
        }
      }
    } catch (e) {
      try {
        if (window.webkit.messageHandlers[name].postMessage != null) { // WKWebView
          return function (message) {
            try {
              window.webkit.messageHandlers[name].postMessage(JSON.stringify(message))
              return true
            } catch (e) {
              return false
            }
          }
        }
      } catch (e) {
        const md5 = require('./vendor/md5')(name)
        return function (message) {
          // UIWebView WebView
          try {
            messages.push(JSON.stringify(message))
            const iframe = document.createElement('iframe')
            iframe.style.display = 'none'
            iframe.src = 'https://bridge/' + md5 + '/query'
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
    }
  })()
  const clients = {}
  const sendToClient = function (message) {
    const { to } = message
    const client = clients[to]
    if (client == null) {
      return false
    }
    const data = {}
    data[name] = message
    client.postMessage(data, '*')
    return true
  }
  // called by native
  hub.query = function () {
    const str = JSON.stringify(messages)
    messages.splice(0, messages.length)
    return str
  }
  // called by native
  hub.transmit = function (str) {
    const message = JSON.parse(str)
    sendToClient(message)
  }
  window.addEventListener('message', function ({ source, data }) {
    try {
      const message = data[name]
      if (message == null) {
        return
      }
      const { from = null, type = null } = message
      if (from == null) {
        throw new Error('from is null')
      }
      if (type === 'disconnect') {
        delete clients[from]
      } else {
        if (clients[from] == null) {
          if (type === 'connect') {
            clients[from] = source
          } else {
            throw new Error('client does not exist')
          }
        }
      }
      sendToNative(message)
    } catch (e) {
      console.log(e)
    }
  })
  // hub did load
  const load = function () {
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
    data[name] = message
    broadcast(window, data)
  }
  load()
  return hub
})('<name>')
