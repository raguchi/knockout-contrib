import ko from 'knockout'

import { addBindingHandlerCreator, addBindingPreprocessor } from './utils'

declare module 'knockout' {
  // tslint:disable-next-line:interface-name
  interface BindingHandler<T> {
    getNamespacedHandler?(binding: string): BindingHandler
  }
}

// Support dynamically-created, namespaced bindings. The binding key syntax is
// "namespace.binding". Within a certain namespace, we can dynamically create the
// handler for any binding. This is particularly useful for bindings that work
// the same way, but just set a different named value, such as for element
// attributes or CSS classes.
const namespacedBindingMatch = /([^\.]+)\.(.+)/
const namespaceDivider = '.'

addBindingHandlerCreator(
  namespacedBindingMatch,
  (match: RegExpMatchArray, bindingKey: string) => {
    const namespace = match[1]
    const namespaceHandler = ko.bindingHandlers[namespace]
    if (namespaceHandler) {
      const bindingName = match[2]
      const handlerFn =
        namespaceHandler.getNamespacedHandler || defaultGetNamespacedHandler
      const handler = handlerFn.call(
        namespaceHandler,
        bindingName,
        namespace,
        bindingKey
      )
      ko.bindingHandlers[bindingKey] = handler
      return handler
    }
  }
)

// Knockout's built-in bindings "attr", "event", "css" and "style" include the idea of
// namespaces, representing it using a single binding that takes an object map of names
// to values. This default handler translates a binding of "namespacedName: value"
// to "namespace: {name: value}" to automatically support those built-in bindings.
export function defaultGetNamespacedHandler(
  this: any,
  name: string,
  namespace: string,
  namespacedName: string
) {
  const handler = ko.utils.extend({}, this)
  function setHandlerFunction(funcName: string) {
    if (handler[funcName]) {
      handler[funcName] = function(el: HTMLElement, valueAccessor: () => any) {
        function subValueAccessor() {
          return { [name]: valueAccessor() }
        }
        const args = Array.prototype.slice.call(arguments, 0)
        args[1] = subValueAccessor
        return (ko.bindingHandlers[namespace] as any)[funcName].apply(
          this,
          args
        )
      }
    }
  }
  // Set new init and update functions that wrap the originals
  setHandlerFunction('init')
  setHandlerFunction('update')
  // Clear any preprocess function since preprocessing of the new binding would need to be different
  if (handler.preprocess) handler.preprocess = null
  if (ko.virtualElements.allowedBindings[namespace]) {
    ko.virtualElements.allowedBindings[namespacedName] = true
  }
  return handler
}

// Adds a preprocess function for every generated namespace.x binding. This can
// be called multiple times for the same binding, and the preprocess functions will
// be chained. If the binding has a custom getNamespacedHandler method, make sure that
// it's set before this function is used.
export function addDefaultNamespacedBindingPreprocessor(
  namespace: string,
  preprocessFn: (...args: any[]) => any
) {
  const handler = ko.getBindingHandler(namespace)
  if (handler) {
    const previousHandlerFn =
      handler.getNamespacedHandler || defaultGetNamespacedHandler
    handler.getNamespacedHandler = function() {
      return addBindingPreprocessor(
        previousHandlerFn.apply(this, arguments),
        preprocessFn
      )
    }
  }
}

// Set the namespaced preprocessor for a specific binding
export function enableAutoNamespacedSyntax(bindingKeyOrHandler: string) {
  addBindingPreprocessor(bindingKeyOrHandler, autoNamespacedPreprocessor)
}

export function autoNamespacedPreprocessor(
  value: string,
  binding: string,
  addBinding: (binding: string, value: any) => any
) {
  if (value.charAt(0) !== '{') return value

  // Handle two-level binding specified as "binding: {key: value}" by parsing inner
  // object and converting to "binding.key: value"
  const subBindings = ko.expressionRewriting.parseObjectLiteral(value)
  ko.utils.arrayForEach(subBindings, (keyValue) => {
    addBinding(binding + namespaceDivider + keyValue.key, keyValue.value)
  })
}
