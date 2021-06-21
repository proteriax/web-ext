const apiMetadata = {"alarms":{"clear":[0,1],"clearAll":[0,0],"get":[0,1],"getAll":[0,0]},"bookmarks":{"create":[1,1],"get":[1,1],"getChildren":[1,1],"getRecent":[1,1],"getSubTree":[1,1],"getTree":[0,0],"move":[2,2],"remove":[1,1],"removeTree":[1,1],"search":[1,1],"update":[2,2]},"browserAction":{"disable":{"min":0,"max":1,"fallbackToNoCallback":true},"enable":{"min":0,"max":1,"fallbackToNoCallback":true},"getBadgeBackgroundColor":[1,1],"getBadgeText":[1,1],"getPopup":[1,1],"getTitle":[1,1],"openPopup":[0,0],"setBadgeBackgroundColor":{"min":1,"max":1,"fallbackToNoCallback":true},"setBadgeText":{"min":1,"max":1,"fallbackToNoCallback":true},"setIcon":[1,1],"setPopup":{"min":1,"max":1,"fallbackToNoCallback":true},"setTitle":{"min":1,"max":1,"fallbackToNoCallback":true}},"browsingData":{"remove":[2,2],"removeCache":[1,1],"removeCookies":[1,1],"removeDownloads":[1,1],"removeFormData":[1,1],"removeHistory":[1,1],"removeLocalStorage":[1,1],"removePasswords":[1,1],"removePluginData":[1,1],"settings":[0,0]},"commands":{"getAll":[0,0]},"contextMenus":{"remove":[1,1],"removeAll":[0,0],"update":[2,2]},"cookies":{"get":[1,1],"getAll":[1,1],"getAllCookieStores":[0,0],"remove":[1,1],"set":[1,1]},"devtools":{"inspectedWindow":{"eval":{"min":1,"max":2,"singleCallbackArg":false}},"panels":{"create":{"min":3,"max":3,"singleCallbackArg":true}}},"downloads":{"cancel":[1,1],"download":[1,1],"erase":[1,1],"getFileIcon":[1,2],"open":{"min":1,"max":1,"fallbackToNoCallback":true},"pause":[1,1],"removeFile":[1,1],"resume":[1,1],"search":[1,1],"show":{"min":1,"max":1,"fallbackToNoCallback":true}},"extension":{"isAllowedFileSchemeAccess":[0,0],"isAllowedIncognitoAccess":[0,0]},"history":{"addUrl":[1,1],"deleteAll":[0,0],"deleteRange":[1,1],"deleteUrl":[1,1],"getVisits":[1,1],"search":[1,1]},"i18n":{"detectLanguage":[1,1],"getAcceptLanguages":[0,0]},"identity":{"launchWebAuthFlow":[1,1]},"idle":{"queryState":[1,1]},"management":{"get":[1,1],"getAll":[0,0],"getSelf":[0,0],"setEnabled":[2,2],"uninstallSelf":[0,1]},"notifications":{"clear":[1,1],"create":[1,2],"getAll":[0,0],"getPermissionLevel":[0,0],"update":[2,2]},"pageAction":{"getPopup":[1,1],"getTitle":[1,1],"hide":{"min":1,"max":1,"fallbackToNoCallback":true},"setIcon":[1,1],"setPopup":{"min":1,"max":1,"fallbackToNoCallback":true},"setTitle":{"min":1,"max":1,"fallbackToNoCallback":true},"show":{"min":1,"max":1,"fallbackToNoCallback":true}},"permissions":{"contains":[1,1],"getAll":[0,0],"remove":[1,1],"request":[1,1]},"runtime":{"getBackgroundPage":[0,0],"getPlatformInfo":[0,0],"openOptionsPage":[0,0],"requestUpdateCheck":[0,0],"sendMessage":[1,3],"sendNativeMessage":[2,2],"setUninstallURL":[1,1]},"sessions":{"getDevices":[0,1],"getRecentlyClosed":[0,1],"restore":[0,1]},"storage":{"local":{"clear":[0,0],"get":[0,1],"getBytesInUse":[0,1],"remove":[1,1],"set":[1,1]},"managed":{"get":[0,1],"getBytesInUse":[0,1]},"sync":{"clear":[0,0],"get":[0,1],"getBytesInUse":[0,1],"remove":[1,1],"set":[1,1]}},"tabs":{"captureVisibleTab":[0,2],"create":[1,1],"detectLanguage":[0,1],"discard":[0,1],"duplicate":[1,1],"executeScript":[1,2],"get":[1,1],"getCurrent":[0,0],"getZoom":[0,1],"getZoomSettings":[0,1],"highlight":[1,1],"insertCSS":[1,2],"move":[2,2],"query":[1,1],"reload":[0,2],"remove":[1,1],"removeCSS":[1,2],"sendMessage":[2,3],"setZoom":[1,2],"setZoomSettings":[1,2],"update":[1,2]},"topSites":{"get":[0,0]},"webNavigation":{"getAllFrames":[1,1],"getFrame":[1,1]},"webRequest":{"handlerBehaviorChanged":[0,0]},"windows":{"create":[0,1],"get":[1,2],"getAll":[0,1],"getCurrent":[0,1],"getLastFocused":[0,1],"remove":[1,1],"update":[2,2]}};
const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE =
  "The message port closed before a response was received."
const SEND_RESPONSE_DEPRECATION_WARNING =
  "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)"
function isFunction(value) {
  return typeof value === "function"
}
function isString(value) {
  return typeof value === "string"
}
const args = (min, max = min) => ({ min, max })
const arg = [args(0), args(1)]
function wrapAPIs() {
  class DefaultWeakMap extends WeakMap {
    constructor(createItem, items = undefined) {
      super(items)
      this.createItem = createItem
    }
    get(key) {
      if (!this.has(key)) {
        this.set(key, this.createItem(key))
      }
      return super.get(key)
    }
  }
  function isThenable(value) {
    return isFunction(value === null || value === void 0 ? void 0 : value.then)
  }
  function makeCallback(promise, metadata) {
    return (...callbackArgs) => {
      if (chrome.runtime.lastError) {
        promise.reject(chrome.runtime.lastError)
      } else if (
        metadata.singleCallbackArg ||
        (callbackArgs.length <= 1 && metadata.singleCallbackArg !== false)
      ) {
        promise.resolve(callbackArgs[0])
      } else {
        promise.resolve(callbackArgs)
      }
    }
  }
  const pluralizeArguments = numArgs => "argument" + (numArgs === 1 ? "" : "s")
  function checkArgRange({ min, max }, actual, name) {
    if (actual < min) {
      throw Error(
        `Expected at least ${min} ${pluralizeArguments(min)} for ${name}(), got ${actual}`
      )
    }
    if (actual > max) {
      throw Error(
        `Expected at most ${max} ${pluralizeArguments(max)} for ${name}(), got ${actual}`
      )
    }
  }
  function wrapAsyncFunction(name, metadata) {
    const method = Array.isArray(metadata)
      ? { min: metadata[0], max: metadata[1] }
      : metadata
    const debugName = typeof name === "symbol" ? name.description : name
    return function asyncFunctionWrapper(target, ...args) {
      checkArgRange(method, args.length, debugName)
      return new Promise((resolve, reject) => {
        if (method.fallbackToNoCallback) {
          try {
            target[name](...args, makeCallback({ resolve, reject }, method))
          } catch (cbError) {
            console.warn(
              `${debugName} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,
              cbError
            )
            target[name](...args)
            method.fallbackToNoCallback = false
            method.noCallback = true
            resolve()
          }
        } else if (method.noCallback) {
          target[name](...args)
          resolve()
        } else {
          target[name](...args, makeCallback({ resolve, reject }, method))
        }
      })
    }
  }
  function wrapMethod(target, method, wrapper) {
    return new Proxy(method, {
      apply(_, thisObj, args) {
        return wrapper.call(thisObj, target, ...args)
      },
    })
  }
  const hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty)
  function wrapObject(target, wrappers = {}, metadata = {}) {
    const cache = Object.create(null)
    const handlers = {
      has(_, prop) {
        return prop in target || prop in cache
      },
      get(_, prop) {
        if (prop in cache) {
          return cache[prop]
        }
        if (!(prop in target)) {
          return
        }
        let value = target[prop]
        if (isFunction(value)) {
          if (isFunction(wrappers[prop])) {
            value = wrapMethod(target, target[prop], wrappers[prop])
          } else if (hasOwnProperty(metadata, prop)) {
            const wrapper = wrapAsyncFunction(prop, metadata[prop])
            value = wrapMethod(target, target[prop], wrapper)
          } else {
            value = value.bind(target)
          }
        } else if (
          typeof value === "object" &&
          value !== null &&
          (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))
        ) {
          value = wrapObject(value, wrappers[prop], metadata[prop])
        } else if (hasOwnProperty(metadata, "*")) {
          value = wrapObject(value, wrappers[prop], metadata["*"])
        } else {
          Object.defineProperty(cache, prop, {
            configurable: true,
            enumerable: true,
            get() {
              return target[prop]
            },
            set(value) {
              target[prop] = value
            },
          })
          return value
        }
        cache[prop] = value
        return value
      },
      set(_, prop, value) {
        if (prop in cache) {
          cache[prop] = value
        } else {
          target[prop] = value
        }
        return true
      },
      defineProperty(_, prop, desc) {
        return Reflect.defineProperty(cache, prop, desc)
      },
      deleteProperty(_, prop) {
        return Reflect.deleteProperty(cache, prop)
      },
    }
    const proxyTarget = Object.create(target)
    return new Proxy(proxyTarget, handlers)
  }
  const wrapEvent = wrapperMap => ({
    addListener(target, listener, ...args) {
      target.addListener(wrapperMap.get(listener), ...args)
    },
    hasListener(target, listener) {
      return target.hasListener(wrapperMap.get(listener))
    },
    removeListener(target, listener) {
      target.removeListener(wrapperMap.get(listener))
    },
  })
  let loggedSendResponseDeprecationWarning = false
  const onMessageWrappers = new DefaultWeakMap(listener => {
    if (!isFunction(listener)) {
      return listener
    }
    return function onMessage(message, sender, sendResponse) {
      let didCallSendResponse = false
      let wrappedSendResponse
      const sendResponsePromise = new Promise(resolve => {
        wrappedSendResponse = response => {
          if (!loggedSendResponseDeprecationWarning) {
            console.warn(SEND_RESPONSE_DEPRECATION_WARNING, new Error().stack)
            loggedSendResponseDeprecationWarning = true
          }
          didCallSendResponse = true
          resolve(response)
        }
      })
      let result
      try {
        result = listener(message, sender, wrappedSendResponse)
      } catch (err) {
        result = Promise.reject(err)
      }
      const isResultThenable = result !== true && isThenable(result)
      if (result !== true && !isResultThenable && !didCallSendResponse) {
        return false
      }
      function sendPromisedResult(promise) {
        promise
          .then(
            msg => {
              sendResponse(msg)
            },
            error => {
              let message
              if (error && (error instanceof Error || isString(error.message))) {
                message = error.message
              } else {
                message = "An unexpected error occurred"
              }
              sendResponse({
                __mozWebExtensionPolyfillReject__: true,
                message,
              })
            }
          )
          .catch(err => {
            console.error("Failed to send onMessage rejected reply", err)
          })
      }
      if (isResultThenable) {
        sendPromisedResult(result)
      } else {
        sendPromisedResult(sendResponsePromise)
      }
      return true
    }
  })
  function wrappedSendMessageCallback({ reject, resolve }, reply) {
    if (chrome.runtime.lastError) {
      if (
        chrome.runtime.lastError.message ===
        CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE
      ) {
        resolve()
      } else {
        reject(chrome.runtime.lastError)
      }
    } else if (
      reply === null || reply === void 0
        ? void 0
        : reply.__mozWebExtensionPolyfillReject__
    ) {
      reject(new Error(reply.message))
    } else {
      resolve(reply)
    }
  }
  function wrappedSendMessage(name, metadata, apiNamespaceObj, ...args) {
    checkArgRange(metadata, args.length, name)
    return new Promise((resolve, reject) => {
      const wrappedCb = wrappedSendMessageCallback.bind(null, {
        resolve,
        reject,
      })
      args.push(wrappedCb)
      apiNamespaceObj.sendMessage(...args)
    })
  }
  const staticWrappers = {
    runtime: {
      onMessage: wrapEvent(onMessageWrappers),
      onMessageExternal: wrapEvent(onMessageWrappers),
      sendMessage: wrappedSendMessage.bind(null, "sendMessage", args(1, 3)),
    },
    tabs: {
      sendMessage: wrappedSendMessage.bind(null, "sendMessage", args(2, 3)),
    },
  }
  const settingMetadata = {
    clear: arg[1],
    get: arg[1],
    set: arg[1],
  }
  apiMetadata["privacy"] = {
    network: { "*": settingMetadata },
    services: { "*": settingMetadata },
    websites: { "*": settingMetadata },
  }
  return wrapObject(chrome, staticWrappers, apiMetadata)
}
export const browser = wrapAPIs()
export default browser
