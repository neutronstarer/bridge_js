
import { v4 } from 'uuid'

export class BridgeClient {
  constructor (hash) {
    // current client id
    const clientId = v4()
    // create a message
    const create = (id, type, method, payload, error) => {
      const message = {}
      if (id != null) message.id = id
      if (type != null) message.type = type
      if (method != null) message.method = method
      if (payload != null) message.payload = payload
      if (error != null) message.error = error
    }

    // handlers
    const handlers = {}
    this.on = (method, handler) => {
      handlers[method] = handler
    }
    const messages = []
    // is hub loaded
    let hubLoaded = false
    // send message
    const send = (message, anyway = false) => {
      message.from = clientId
      if (anyway === false) {
        if (hubLoaded === false) {
          messages.push(message)
          return
        }
      }
      const data = {}
      data[hash] = message
      window.top.postMessage(data, '*')
    }
    let _id = 0
    this.emit = (method, payload) => {
      send(create(_id++, 'emit', method, payload, null))
    }
    // reply of deliver
    const promiseContexts = {}
    const didResolve = (id, payload) => {
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
    const didReject = (id, error) => {
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
    this.deliver = async (method, payload) => {
      const id = _id++
      return new Promise((resolve, reject) => {
        send(create(id, 'deliver', method, payload, null))
        const context = {}
        context.resolve = resolve
        context.reject = reject
        this.timeout = (timeout) => {
          context.timeout = window.setTimeout(() => {
            send(create(id, 'cancel', null, null, null))
            didReject(new Error('timed out'))
          }, timeout)
          return this
        }
        this.cancel = () => {
          send(create(id, 'cancel', null, null, null))
          didReject(new Error('cancelled'))
        }
        promiseContexts[id] = context
      })
    }
    const hubDidLoad = () => {
      if (hubLoaded === true) {
        return
      }
      hubLoaded = true
      send({ type: 'connect' })
      messages.forEach(element => {
        send(element)
      })
      messages.splice(0, messages.length)
    }
    window.addEventListener('message', async function ({ data, source }) {
      try {
        const message = data[hash]
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

    const didLoad = () => {
      // tell the native load hub
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'https://' + hash + '/load'
      document.documentElement.appendChild(iframe)
      setTimeout(function () {
        document.documentElement.removeChild(iframe)
      }, 1)
      send({ type: 'connect' }, true)
    }
    const didUnload = () => {
      send({ type: 'disconnect' })
      const error = new Error('did unload')
      for (const key in promiseContexts) {
        const context = promiseContexts[key]
        context.reject(error)
      }
    }
    window.addEventListener('unload', () => {
      didUnload()
    })
    didLoad()
  }

  static of = (name) => {
    const hash = require('md5')(name)
    const clientKey = 'client_' + hash
    let client = window[clientKey]
    if (client != null) return client
    client = new BridgeClient(hash)
    window[clientKey] = client
    return client
  }
}
