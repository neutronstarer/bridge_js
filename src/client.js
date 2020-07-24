/* global define */
; (function ($) {
  const of = function (name) {
    const clientKey = 'client.' + name
    let client = window[clientKey]
    if (client != null) return client
    client = {}
    window[clientKey] = client
    const messages = []
    let hubLoaded = false
    const clientId = require('./vendor/guid')()
    // create a message
    const createMessage = function (id, type, method, payload, error) {
      const message = {}
      if (id != null) message.id = id
      if (type != null) message.type = type
      if (method != null) message.method = method
      if (payload != null) message.payload = payload
      if (error != null) message.error = error
      return message
    }
    // send message
    const sendMessage = function (message, anyway = false) {
      message.from = clientId
      if (anyway === false) {
        if (hubLoaded === false) {
          messages.push(message)
          return
        }
      }
      const data = {}
      data[name] = message
      window.top.postMessage(data, '*')
    }
    // message id
    let _id = 0
    // emit
    client.emit = function (method, payload) {
      sendMessage(createMessage(_id++, 'emit', method, payload, null))
    }
    // deliver promiseContexts
    const promiseContexts = {}
    // complete promiseContext
    const completePromiseContextById = function (id, payload, error, automaticallyDelete = true) {
      const promiseContext = promiseContexts[id]
      if (promiseContext == null) {
        return false
      }
      if (promiseContext.timeout != null) {
        window.clearTimeout(promiseContext.timeout)
        promiseContext.timeout = null
      }
      if (error != null) {
        promiseContext.reject(error)
      } else {
        promiseContext.resolve(payload)
      }
      if (automaticallyDelete === true) {
        delete promiseContexts[id]
      }
      return true
    }
    // deliver
    client.deliver = function (method, payload) {
      const id = _id++
      sendMessage(createMessage(id, 'deliver', method, payload, null))
      const promiseContext = {}
      promiseContexts[id] = promiseContext
      const promise = new Promise(function (resolve, reject) {
        promiseContext.resolve = resolve
        promiseContext.reject = reject
      })
      promise.setTimeout = function (timeout) {
        promiseContext.timeout = window.setTimeout(function () {
          promiseContext.timeout = null
          completePromiseContextById(id, null, 'timed out')
        }, timeout)
        return this
      }
      promise.setCancelToken = function (cancelToken) {
        cancelToken.cancel = function () {
          if (completePromiseContextById(id, null, 'cancelled') === false) {
            return
          }
          sendMessage(createMessage(id, 'cancel', null, null, null))
        }
        return this
      }
      return promise
    }
    const handlers = {}
    client.on = function (method, event, cancel) {
      handlers[method] = {
        event: event,
        cancel: cancel
      }
    }
    const cancels = {}
    window.addEventListener('message', function ({ data, source }) {
      try {
        const message = data[name]
        if (message == null) {
          return
        }
        const { id, type, method, payload, error } = message
        // hub did load
        if (type === 'load') {
          if (source === window.top) {
            if (hubLoaded === true) {
              return
            }
            hubLoaded = true
            // connect handler
            const handler = handlers.connect
            if (handler != null) {
              handler.event(payload, function () {})
            }
            sendMessage(createMessage(null, 'connect'))
            messages.forEach(function (element) {
              sendMessage(element)
            })
            messages.splice(0, messages.length)
          }
          return
        }
        // emit
        if (type === 'emit') {
          const handler = handlers[method]
          if (handler == null) {
            return
          }
          handler.event(payload)
          return
        }
        // deliver
        if (type === 'deliver') {
          const handler = handlers[method]
          if (handler == null) {
            sendMessage(createMessage(id, 'ack', null, null, 'unsupported method'))
            return
          }
          const cancelContext = handler.event(payload, function (payload, error) {
            sendMessage(createMessage(id, 'ack', null, payload, error))
            delete cancels[id]
          })
          const cancel = handler.cancel
          if (cancel != null) {
            cancels[id] = function () {
              cancel(cancelContext)
              delete cancels[id]
            }
          }
        }
        // ack
        if (type === 'ack') {
          completePromiseContextById(id, payload, error)
          return
        }
        // cancel
        if (type === 'cancel') {
          const cancel = cancels[id]
          if (cancel == null) {
            return
          }
          cancel()
        }
      } catch (e) { }
    })
    const load = function () {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'https://bridge/' + require('./vendor/md5')(name) + '/load'
      document.documentElement.appendChild(iframe)
      setTimeout(function () {
        document.documentElement.removeChild(iframe)
      }, 1)
    }
    const unload = function () {
      for (const id in promiseContexts) {
        completePromiseContextById(id, null, 'disconnected', false)
      }
      sendMessage(createMessage(null, 'disconnect'))
    }
    window.addEventListener('unload', function () {
      unload()
    })
    load()
  }
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return { of }
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = { of }
  } else {
    $.Client = { of }
  }
})(this)
