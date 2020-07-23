/* global define */
/* eslint-disable strict */
;(function ($) {
  'use strict'
  const of = function (name) {
    const clientKey = 'client.' + name
    let client = window[clientKey]
    if (client != null) return client
    client = (function () {
      // current client id
      const clientId = require('./lib/guid')()
      // create a message
      const create = function (id, type, method, payload, error) {
        const message = {}
        if (id != null) message.id = id
        if (type != null) message.type = type
        if (method != null) message.method = method
        if (payload != null) message.payload = payload
        if (error != null) message.error = error
      }
      // handlers
      const handlers = {}
      this.on = function (method, handler) {
        handlers[method] = handler
      }
      const messages = []
      // is hub loaded
      let hubLoaded = false
      // send message
      const send = function (message, anyway = false) {
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
      let _id = 0
      this.emit = function (method, payload) {
        send(create(_id++, 'emit', method, payload, null))
      }
      // reply of deliver
      const promiseContexts = {}
      const didResolve = function (id, payload) {
        const context = promiseContexts[id]
        if (context == null) {
          return
        }
        delete promiseContexts[id]
        const timeout = context.timeout
        if (timeout != null) {
          window.clearTimeout(timeout)
        }
        context.resolve(payload)
      }
      const didReject = function (id, error) {
        const context = promiseContexts[id]
        if (context == null) {
          return
        }
        delete promiseContexts[id]
        const timeout = context.timeout
        if (timeout != null) {
          window.clearTimeout(timeout)
        }
        context.reject(error)
      }
      this.deliver = async function (method, payload) {
        const id = _id++
        return new Promise(function (resolve, reject) {
          send(create(id, 'deliver', method, payload, null))
          const context = {}
          context.resolve = resolve
          context.reject = reject
          this.timeout = function (timeout) {
            context.timeout = window.setTimeout(function () {
              send(create(id, 'cancel', null, null, null))
              didReject(new Error('timed out'))
            }, timeout)
            return this
          }
          this.cancel = function () {
            send(create(id, 'cancel', null, null, null))
            didReject(new Error('cancelled'))
          }
          promiseContexts[id] = context
        })
      }
      const hubDidLoad = function () {
        if (hubLoaded === true) {
          return
        }
        hubLoaded = true
        send({ type: 'connect' })
        messages.forEach(function (element) {
          send(element)
        })
        messages.splice(0, messages.length)
      }
      window.addEventListener('message', async function ({ data, source }) {
        try {
          const message = data[name]
          if (!message) return
          const { id, type, method, payload, error } = message
          if (type === 'load') {
            if (source === window.top) {
              hubDidLoad()
            }
            return
          }
          if (type === 'ack') {
            if (error == null) {
              didResolve(id, payload)
            } else {
              didReject(id, error)
            }
            return
          }
          if (type === 'emit') {
            const handler = handlers[method]
            if (handler == null) {
              return
            }
            handler(payload)
            return
          }
          if (type === 'deliver') {
            const handler = handlers[method]
            if (handler == null) {
              return
            }
            try {
              send(create(id, 'ack', null, await handler(payload), null))
            } catch (e) {
              send(create(id, 'ack', null, null, e))
            }
          }
        } catch (e) { }
      })

      const didLoad = function () {
      // tell the native load hub
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = 'https://' + require('./lib/md5')(name) + '/load'
        document.documentElement.appendChild(iframe)
        setTimeout(function () {
          document.documentElement.removeChild(iframe)
        }, 1)
        send({ type: 'connect' }, true)
      }
      const didUnload = function () {
        send({ type: 'disconnect' })
        const error = new Error('did unload')
        for (const key in promiseContexts) {
          const context = promiseContexts[key]
          context.reject(error)
        }
      }
      window.addEventListener('unload', function () {
        didUnload()
      })
      didLoad()
    }())
    window[clientKey] = client
    return client
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
