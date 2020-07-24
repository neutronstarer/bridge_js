/* global define */
;(function ($) {
  'use strict'
  const guid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; var v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return guid
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = guid
  } else {
    $.guid = guid
  }
})(this)
