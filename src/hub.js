
;(function (name) {
  const hubKey = 'bridge_hub_' + name
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
        return function (message) {
          // UIWebView WebView
          try {
            messages.push(JSON.stringify(message))
            const iframe = document.createElement('iframe')
            iframe.style.display = 'none'
            iframe.src = 'https://bridge/query?name=' + encodeURIComponent(name)
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
  const bridges = {}
  const sendToBridge = function (message) {
    const { to } = message
    const bridge = bridges[to]
    if (bridge == null) {
      return false
    }
    const data = {}
    data[name] = message
    bridge.postMessage(data, '*')
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
    sendToBridge(message)
    return true
  }
  window.addEventListener('message', function ({ source, data }) {
    try {
      const message = data[name]
      if (message == null) {
        return
      }
      const { from = null, to = null, type = null } = message
      if (to !== name){
        return
      }
      if (from == null) {
        throw new Error('from == null')
      }
      const bridge = bridges[from]
      if (type === 'disconnect') {
        if (bridge == null) {
          return
        }
        if (bridge !== source) {
          throw new Error('bridge id mismatch')
        }
        delete bridges[from]
      } else if (type === 'connect') {
        if (bridge === source) {
          return
        }
        if (bridge != null) {
          throw new Error('bridge id mismatch')
        }
        bridges[from] = source
      } else {
        if (bridge !== source) {
          throw new Error('bridge id mismatch')
        }
      }
      sendToNative(message)
    } catch (e) {
      throw e
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
  const unload = function (){
    for (const key in bridges){
      const bridge = bridges[key]
      const message = {from: key, to: name, type: 'disconnect'}
      sendToNative(message)
    }
    bridges = {}
  }

  window.addEventListener('unload', function () {
    unload()
  })

  load()
  return hub
})('<name>')
