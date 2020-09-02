(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Bridge = factory());
}(this, (function () { 'use strict';

  var bridge = {
    of: function of(name) {
      var bridgeKey = 'bridge_' + name;
      var bridge = window[bridgeKey];
      if (bridge != null) return bridge;
      bridge = {};
      window[bridgeKey] = bridge; // create a message

      var createMessage = function createMessage(id, type, method, payload, error) {
        var message = {};
        if (id != null) message.id = id;
        if (type != null) message.type = type;
        if (method != null) message.method = method;
        if (payload != null) message.payload = payload;
        if (error != null) message.error = error;
        return message;
      }; // bridge id, a guid


      var bridgeId = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          var v = c === 'x' ? r : r & 0x3 | 0x8;
          return v.toString(16);
        });
      }(); // messages cached before hud load


      var messages = [];
      var hubLoaded = false; // send message

      var sendMessage = function sendMessage(message) {
        var anyway = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        message.from = bridgeId;
        message.to = name;

        if (anyway === false) {
          if (hubLoaded === false) {
            messages.push(message);
            return;
          }
        }

        var data = {};
        data[name] = message;
        window.top.postMessage(data, '*');
      }; // message seq id


      var _id = 0; // emit

      bridge.emit = function (method, payload) {
        sendMessage(createMessage(_id++, 'emit', method, payload, null));
      }; // deliver promise context


      var promiseContexts = {}; // complete promiseContext
      // complete when bridge cancel , bridge unload, or server ack

      var completePromiseContextById = function completePromiseContextById(id, res, error) {
        var automaticallyDelete = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var promiseContext = promiseContexts[id];

        if (promiseContext == null) {
          return;
        }

        if (automaticallyDelete === true) {
          delete promiseContexts[id];
        } // should tell server to cancel


        if (error === 'cancelled' || error === 'disconnected') {
          sendMessage(createMessage(id, 'cancel', null, null, null));
        }

        if (promiseContext.timeoutContext != null) {
          window.clearTimeout(promiseContext.timeoutContext);
          promiseContext.timeoutContext = null;
        }

        if (error == null) {
          promiseContext.resolve(res);
        } else {
          promiseContext.reject(error);
        }
      }; // deliver


      bridge.deliver = function (method, req) {
        var id = _id++;
        sendMessage(createMessage(id, 'deliver', method, req, null));
        var promiseContext = {};
        promiseContexts[id] = promiseContext;
        var promise = new Promise(function (resolve, reject) {
          promiseContext.resolve = resolve;
          promiseContext.reject = reject;
        });

        promise.setTimeout = function (timeout) {
          if (promiseContext.timeoutContext != null) {
            window.clearTimeout(promiseContext.timeoutContext);
          }

          promiseContext.timeoutContext = window.setTimeout(function () {
            completePromiseContextById(id, null, 'timed out');
          }, timeout);
          return this;
        };

        promise.setCancelToken = function (cancelToken) {
          cancelToken.cancel = function () {
            completePromiseContextById(id, null, 'cancelled');
          };

          return this;
        };

        return promise;
      };

      var handlers = {};

      bridge.on = function (method) {
        var handler = handlers[method];

        if (handler == null) {
          handler = {
            event: function event(onEvent) {
              this.onEvent = onEvent;
              return this;
            },
            cancel: function cancel(onCancel) {
              this.onCancel = onCancel;
              return this;
            }
          };
          handlers[method] = handler;
        }

        return handler;
      };

      var cancels = {};
      window.addEventListener('message', function (_ref) {
        var data = _ref.data,
            source = _ref.source;

        try {
          var message = data[name];

          if (message == null) {
            return;
          }

          var id = message.id,
              to = message.to,
              type = message.type,
              method = message.method,
              payload = message.payload,
              error = message.error; // hub did load

          if (type === 'load') {
            if (source === window.top) {
              if (hubLoaded === true) {
                return;
              }

              hubLoaded = true;
              var handler = handlers.connect;

              if (handler != null) {
                handler.onEvent(payload, function () {});
              }

              sendMessage(createMessage(null, 'connect')); // send cached messages

              messages.forEach(function (element) {
                sendMessage(element);
              });
              messages.splice(0, messages.length);
            }

            return;
          }

          if (to !== bridgeId) {
            return;
          } // ack


          if (type === 'ack') {
            completePromiseContextById(id, payload, error);
            return;
          } // cancel


          if (type === 'cancel') {
            var cancel = cancels[id];

            if (cancel == null) {
              return;
            }

            cancel();
          } // emit


          if (type === 'emit') {
            var _handler = handlers[method];

            if (_handler == null) {
              return;
            }

            _handler.onEvent(payload);

            return;
          } // deliver


          if (type === 'deliver') {
            var completed = false;

            var ack = function ack(id, res, error) {
              sendMessage(createMessage(id, 'ack', null, res, error));
            };

            var _handler2 = handlers[method];

            if (_handler2 == null) {
              ack(null, 'unsupported method');
              return;
            }

            var cancelContext = _handler2.onEvent(payload, function (res, error) {
              if (completed === true) {
                return;
              }

              completed = true;
              ack(id, res, error);
              delete cancels[id];
            });

            var _cancel = _handler2.onCancel;

            if (_cancel == null) {
              return;
            }

            cancels[id] = function () {
              if (completed === true) {
                return;
              }

              completed = true;

              _cancel(cancelContext);

              delete cancels[id];
            };
          }
        } catch (e) {
          console.log(e);
        }
      });

      var load = function load() {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'https://bridge/load?name=' + encodeURIComponent(name);
        document.documentElement.appendChild(iframe);
        setTimeout(function () {
          document.documentElement.removeChild(iframe);
        }, 1);
      };

      var unload = function unload() {
        for (var id in promiseContexts) {
          completePromiseContextById(id, null, 'disconnected', false);
        }

        sendMessage(createMessage(null, 'disconnect'));
      };

      window.addEventListener('unload', function () {
        unload();
      });
      load();
      return bridge;
    }
  };

  return bridge;

})));
