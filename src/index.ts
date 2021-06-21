// rpl committed faa22a4 on 3 Mar
import type { Browser } from "webextension-polyfill-ts"
import apiMetadata from "./web-ext-api.json"

export type { Events } from "webextension-polyfill-ts"

interface PromiseObject<T = any> {
  resolve(value?: T): void
  reject(error: Error | chrome.runtime.LastError): void
}

/* webextension-polyfill - v0.5.0 - Thu Sep 26 2019 22:22:26 */
/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE =
  "The message port closed before a response was received."
const SEND_RESPONSE_DEPRECATION_WARNING =
  "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)"

type AnyFn = (...args: any[]) => void

function isFunction(value: any): value is Function {
  return typeof value === "function"
}
function isString(value: any): value is string {
  return typeof value === "string"
}

const args = (min: number, max = min) => ({ min, max })
const arg = [args(0), args(1)]

interface Metadata {
  min: number
  max: number
  noCallback?: boolean
  fallbackToNoCallback?: boolean
  singleCallbackArg?: boolean
}

function wrapAPIs() {
  /**
   * A WeakMap subclass which creates and stores a value for any key which does
   * not exist when accessed, but behaves exactly as an ordinary WeakMap
   * otherwise.
   *
   * @param {function} createItem
   *        A function which will be called in order to create the value for any
   *        key which does not exist, the first time it is accessed. The
   *        function receives, as its only argument, the key being created.
   */
  class DefaultWeakMap<K extends object, V> extends WeakMap<K, V> {
    createItem: (key: K) => V

    constructor(createItem: (key: K) => V, items = undefined) {
      super(items)
      this.createItem = createItem
    }

    get(key: K) {
      if (!this.has(key)) {
        this.set(key, this.createItem(key))
      }
      return super.get(key)!
    }
  }

  /**
   * Returns true if the given object is an object with a `then` method, and can
   * therefore be assumed to behave as a Promise.
   *
   * @param {*} value The value to test.
   * @returns {boolean} True if the value is thenable.
   */
  function isThenable(value: any): value is PromiseLike<any> {
    return isFunction(value?.then)
  }

  /**
   * Creates and returns a function which, when called, will resolve or reject
   * the given promise based on how it is called:
   *
   * - If, when called, `chrome.runtime.lastError` contains a non-null object,
   *   the promise is rejected with that value.
   * - If the function is called with exactly one argument, the promise is
   *   resolved to that value.
   * - Otherwise, the promise is resolved to an array containing all of the
   *   function's arguments.
   *
   * @param promise
   *        An object containing the resolution and rejection functions of a
   *        promise.
   * @param promise.resolve
   *        The promise's resolution function.
   * @param promise.rejection
   *        The promise's rejection function.
   * @param metadata
   *        Metadata about the wrapped method which has created the callback.
   * @param metadata.maxResolvedArgs
   *        The maximum number of arguments which may be passed to the
   *        callback created by the wrapped async function.
   *
   * @returns
   *        The generated callback function.
   */
  function makeCallback(promise: PromiseObject<any>, metadata: Metadata) {
    return (...callbackArgs: any[]) => {
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

  const pluralizeArguments = (numArgs: number) => "argument" + (numArgs === 1 ? "" : "s")

  function checkArgRange({ min, max }: Metadata, actual: number, name: string | number) {
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

  /**
   * Creates a wrapper function for a method with the given name and metadata.
   *
   * @param name
   *        The name of the method which is being wrapped.
   * @param metadata
   *        Metadata about the method being wrapped.
   * @param metadata.min
   *        The minimum number of arguments which must be passed to the
   *        function. If called with fewer than this number of arguments, the
   *        wrapper will raise an exception.
   * @param metadata.max
   *        The maximum number of arguments which may be passed to the
   *        function. If called with more than this number of arguments, the
   *        wrapper will raise an exception.
   * @param metadata.maxResolvedArgs
   *        The maximum number of arguments which may be passed to the
   *        callback created by the wrapped async function.
   *
   * @returns The generated wrapper function.
   */
  function wrapAsyncFunction(name: PropertyKey, metadata: number[] | Metadata) {
    const method = Array.isArray(metadata)
      ? ({ min: metadata[0], max: metadata[1] } as Metadata)
      : metadata

    const debugName = typeof name === "symbol" ? name.description! : name

    return function asyncFunctionWrapper(target: object, ...args: any[]) {
      checkArgRange(method, args.length, debugName)

      return new Promise((resolve, reject) => {
        if (method.fallbackToNoCallback) {
          // This API method has currently no callback on Chrome, but it return a promise on Firefox,
          // and so the polyfill will try to call it with a callback first, and it will fallback
          // to not passing the callback if the first call fails.
          try {
            target[name](...args, makeCallback({ resolve, reject }, method))
          } catch (cbError) {
            console.warn(
              `${debugName} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,
              cbError
            )

            target[name](...args)

            // Update the API method metadata, so that the next API calls will not try to
            // use the unsupported callback anymore.
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

  /**
   * Wraps an existing method of the target object, so that calls to it are
   * intercepted by the given wrapper function. The wrapper function receives,
   * as its first argument, the original `target` object, followed by each of
   * the arguments passed to the original method.
   *
   * @param target
   *        The original target object that the wrapped method belongs to.
   * @param method
   *        The method being wrapped. This is used as the target of the Proxy
   *        object which is created to wrap the method.
   * @param wrapper
   *        The wrapper function which is called in place of a direct invocation
   *        of the wrapped method.
   *
   * @returns A Proxy object for the given method, which invokes the given wrapper
   *    method in its place.
   */
  function wrapMethod<T extends Function>(target: object, method: T, wrapper: T) {
    return new Proxy(method, {
      apply(_, thisObj, args) {
        return wrapper.call(thisObj, target, ...args)
      },
    })
  }

  const hasOwnProperty: (obj: any, key: PropertyKey) => boolean = Function.call.bind(
    Object.prototype.hasOwnProperty
  ) as any

  /**
   * Wraps an object in a Proxy which intercepts and wraps certain methods
   * based on the given `wrappers` and `metadata` objects.
   *
   * @param target
   *        The target object to wrap.
   *
   * @param wrappers
   *        An object tree containing wrapper functions for special cases. Any
   *        function present in this object tree is called in place of the
   *        method in the same location in the `target` object tree. These
   *        wrapper methods are invoked as described in {@see wrapMethod}.
   *
   * @param metadata
   *        An object tree containing metadata used to automatically generate
   *        Promise-based wrapper functions for asynchronous. Any function in
   *        the `target` object tree which has a corresponding metadata object
   *        in the same location in the `metadata` tree is replaced with an
   *        automatically-generated wrapper function, as described in
   *        {@see wrapAsyncFunction}
   */
  function wrapObject(target: object, wrappers = {}, metadata = {}): any {
    const cache = Object.create(null)
    const handlers: ProxyHandler<any> = {
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
          // This is a method on the underlying object. Check if we need to do
          // any wrapping.

          if (isFunction(wrappers[prop])) {
            // We have a special-case wrapper for this method.
            value = wrapMethod(target, target[prop], wrappers[prop])
          } else if (hasOwnProperty(metadata, prop)) {
            // This is an async method that we have metadata for. Create a
            // Promise wrapper for it.
            const wrapper = wrapAsyncFunction(prop, metadata[prop])
            value = wrapMethod(target, target[prop], wrapper)
          } else {
            // This is a method that we don't know or care about. Return the
            // original method, bound to the underlying object.
            value = value.bind(target)
          }
        } else if (
          typeof value === "object" &&
          value !== null &&
          (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))
        ) {
          // This is an object that we need to do some wrapping for the children
          // of. Create a sub-object wrapper for it with the appropriate child
          // metadata.
          value = wrapObject(value, wrappers[prop], metadata[prop])
        } else if (hasOwnProperty(metadata, "*")) {
          // Wrap all properties in * namespace.
          value = wrapObject(value, wrappers[prop], metadata["*"])
        } else {
          // We don't need to do any wrapping for this property,
          // so just forward all access to the underlying object.
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

    // Per contract of the Proxy API, the "get" proxy handler must return the
    // original value of the target if that value is declared read-only and
    // non-configurable. For this reason, we create an object with the
    // prototype set to `target` instead of using `target` directly.
    // Otherwise we cannot return a custom object for APIs that
    // are declared read-only and non-configurable, such as `chrome.devtools`.
    //
    // The proxy handlers themselves will still use the original `target`
    // instead of the `proxyTarget`, so that the methods and properties are
    // dereferenced via the original targets.
    const proxyTarget = Object.create(target)
    return new Proxy(proxyTarget, handlers)
  }

  chrome.tabs.onActivated

  /**
   * Creates a set of wrapper functions for an event object, which handles
   * wrapping of listener functions that those messages are passed.
   *
   * A single wrapper is created for each listener function, and stored in a
   * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
   * retrieve the original wrapper, so that  attempts to remove a
   * previously-added listener work as expected.
   *
   * @param wrapperMap
   *        A DefaultWeakMap object which will create the appropriate wrapper
   *        for a given listener function when one does not exist, and retrieve
   *        an existing one when it does.
   */
  const wrapEvent = (wrapperMap: DefaultWeakMap<AnyFn, AnyFn>) => ({
    addListener(target, listener, ...args: any[]) {
      target.addListener(wrapperMap.get(listener), ...args)
    },

    hasListener(target, listener) {
      return target.hasListener(wrapperMap.get(listener))
    },

    removeListener(target, listener) {
      target.removeListener(wrapperMap.get(listener))
    },
  })

  // Keep track if the deprecation warning has been logged at least once.
  let loggedSendResponseDeprecationWarning = false

  const onMessageWrappers = new DefaultWeakMap<AnyFn, AnyFn>(listener => {
    if (!isFunction(listener)) {
      return listener
    }

    /**
     * Wraps a message listener function so that it may send responses based on
     * its return value, rather than by returning a sentinel value and calling a
     * callback. If the listener function returns a Promise, the response is
     * sent when the promise either resolves or rejects.
     *
     * @param message
     *        The message sent by the other end of the channel.
     * @param sender
     *        Details about the sender of the message.
     * @param sendResponse
     *        A callback which, when called with an arbitrary argument, sends
     *        that value as a response.
     * @returns
     *        True if the wrapped listener returned a Promise, which will later
     *        yield a response. False otherwise.
     */
    return function onMessage(message: any, sender: object, sendResponse: AnyFn) {
      let didCallSendResponse = false

      let wrappedSendResponse: (response: any) => void
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

      let result: any
      try {
        result = listener(message, sender, wrappedSendResponse!)
      } catch (err) {
        result = Promise.reject(err)
      }

      const isResultThenable = result !== true && isThenable(result)

      // If the listener didn't returned true or a Promise, or called
      // wrappedSendResponse synchronously, we can exit earlier
      // because there will be no response sent from this listener.
      if (result !== true && !isResultThenable && !didCallSendResponse) {
        return false
      }

      // A small helper to send the message if the promise resolves
      // and an error if the promise rejects (a wrapped sendMessage has
      // to translate the message into a resolved promise or a rejected
      // promise).
      function sendPromisedResult<T>(promise: Promise<T>) {
        promise
          .then(
            msg => {
              // send the message value.
              sendResponse(msg)
            },
            error => {
              // Send a JSON representation of the error if the rejected value
              // is an instance of error, or the object itself otherwise.
              let message: string
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
            // Print an error on the console if unable to send the response.
            console.error("Failed to send onMessage rejected reply", err)
          })
      }

      // If the listener returned a Promise, send the resolved value as a
      // result, otherwise wait the promise related to the wrappedSendResponse
      // callback to resolve and send it as a response.
      if (isResultThenable) {
        sendPromisedResult(result)
      } else {
        sendPromisedResult(sendResponsePromise)
      }

      // Let Chrome know that the listener is replying.
      return true
    }
  })

  function wrappedSendMessageCallback({ reject, resolve }: PromiseObject<any>, reply) {
    if (chrome.runtime.lastError) {
      // Detect when none of the listeners replied to the sendMessage call and resolve
      // the promise to undefined as in Firefox.
      // See https://github.com/mozilla/webextension-polyfill/issues/130
      if (
        chrome.runtime.lastError.message ===
        CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE
      ) {
        resolve()
      } else {
        reject(chrome.runtime.lastError)
      }
    } else if (reply?.__mozWebExtensionPolyfillReject__) {
      // Convert back the JSON representation of the error into
      // an Error instance.
      reject(new Error(reply.message))
    } else {
      resolve(reply)
    }
  }

  function wrappedSendMessage(
    name: string,
    metadata: Metadata,
    apiNamespaceObj,
    ...args: any[]
  ) {
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

export const browser = wrapAPIs() as Browser
export default browser
