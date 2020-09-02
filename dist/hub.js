(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  function _readOnlyError(name) {
    throw new Error("\"" + name + "\" is read-only");
  }

  (function (name) {
    var hubKey = 'bridge_hub_' + name;
    var hub = window[hubKey];
    if (hub != null) return hub;
    hub = {};
    window[hubKey] = hub; // cache messages waiting for query

    var messages = [];

    var sendToNative = function () {
      try {
        if (window[name].postMessage != null) {
          // android WebView
          return function (message) {
            try {
              window[name].postMessage(JSON.stringify(message));
              return true;
            } catch (e) {
              return false;
            }
          };
        }
      } catch (e) {
        try {
          if (window.webkit.messageHandlers[name].postMessage != null) {
            // WKWebView
            return function (message) {
              try {
                window.webkit.messageHandlers[name].postMessage(JSON.stringify(message));
                return true;
              } catch (e) {
                return false;
              }
            };
          }
        } catch (e) {
          return function (message) {
            // UIWebView WebView
            try {
              messages.push(JSON.stringify(message));
              var iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = 'https://bridge/query?name=' + encodeURIComponent(name);
              document.documentElement.appendChild(iframe);
              setTimeout(function () {
                document.documentElement.removeChild(iframe);
              }, 1);
              return true;
            } catch (e) {
              return false;
            }
          };
        }
      }
    }();

    var bridges = {};

    var sendToBridge = function sendToBridge(message) {
      var to = message.to;
      var bridge = bridges[to];

      if (bridge == null) {
        return false;
      }

      var data = {};
      data[name] = message;
      bridge.postMessage(data, '*');
      return true;
    }; // called by native


    hub.query = function () {
      var str = JSON.stringify(messages);
      messages.splice(0, messages.length);
      return str;
    }; // called by native


    hub.transmit = function (str) {
      var message = JSON.parse(str);
      sendToBridge(message);
      return true;
    };

    window.addEventListener('message', function (_ref) {
      var source = _ref.source,
          data = _ref.data;

      try {
        var message = data[name];

        if (message == null) {
          return;
        }

        var _message$from = message.from,
            from = _message$from === void 0 ? null : _message$from,
            _message$to = message.to,
            to = _message$to === void 0 ? null : _message$to,
            _message$type = message.type,
            type = _message$type === void 0 ? null : _message$type;

        if (to !== name) {
          return;
        }

        if (from == null) {
          throw new Error('from == null');
        }

        var bridge = bridges[from];

        if (type === 'disconnect') {
          if (bridge == null) {
            return;
          }

          if (bridge !== source) {
            throw new Error('bridge id mismatch');
          }

          delete bridges[from];
        } else if (type === 'connect') {
          if (bridge === source) {
            return;
          }

          if (bridge != null) {
            throw new Error('bridge id mismatch');
          }

          bridges[from] = source;
        } else {
          if (bridge !== source) {
            throw new Error('bridge id mismatch');
          }
        }

        sendToNative(message);
      } catch (e) {
        throw e;
      }
    }); // hub did load

    var load = function load() {
      // broadcast message to nested windows
      var broadcast = function broadcast(wd, message) {
        wd.postMessage(message, '*');
        var frames = wd.frames;

        for (var i = 0, l = frames.length; i < l; i++) {
          broadcast(frames[i]);
        }
      };

      var message = {
        type: 'load'
      };
      var data = {};
      data[name] = message;
      broadcast(window, data);
    };

    var unload = function unload() {
      for (var key in bridges) {
        var bridge = bridges[key];
        var message = {
          from: key,
          to: name,
          type: 'disconnect'
        };
        sendToNative(message);
      }

      bridges = (_readOnlyError("bridges"), {});
    };

    window.addEventListener('unload', function () {
      unload();
    });
    load();
    return hub;
  })('<name>');

})));
