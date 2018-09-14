import ko from 'knockout'

// Add a preprocess function to a binding handler.
export function addBindingPreprocessor(
  bindingKeyOrHandler: string,
  preprocessFn: (...args: any[]) => any
) {
  return chainPreprocessor(
    getOrCreateHandler(bindingKeyOrHandler),
    'preprocess',
    preprocessFn
  )
}

// These utility functions are separated out because they're also used by
// preprocessBindingProperty

// Get the binding handler or create a new, empty one
export function getOrCreateHandler(
  bindingKeyOrHandler: string
): ko.BindingHandler {
  return typeof bindingKeyOrHandler === 'object'
    ? bindingKeyOrHandler
    : ko.getBindingHandler(bindingKeyOrHandler) ||
        (ko.bindingHandlers[bindingKeyOrHandler] = {})
}

// Add a preprocess function
export function chainPreprocessor(
  obj: { [k: string]: any },
  prop: string,
  fn: any
) {
  if (obj[prop]) {
    // If the handler already has a preprocess function, chain the new
    // one after the existing one. If the previous function in the chain
    // returns a falsy value (to remove the binding), the chain ends. This
    // method allows each function to modify and return the binding value.
    const previousFn = obj[prop]
    obj[prop] = function(value: any, binding: any, addBinding: any) {
      value = previousFn.call(this, value, binding, addBinding)
      if (value) return fn.call(this, value, binding, addBinding)
    }
  } else {
    obj[prop] = fn
  }
  return obj
}

// Add a preprocessNode function to the binding provider. If a
// function already exists, chain the new one after it. This calls
// each function in the chain until one modifies the node. This
// method allows only one function to modify the node.
export function addNodePreprocessor(preprocessFn: (...args: any[]) => any) {
  const provider = ko.bindingProvider.instance
  if (provider.preprocessNode) {
    const previousPreprocessFn = provider.preprocessNode
    provider.preprocessNode = function(node) {
      let newNodes = previousPreprocessFn.call(this, node)
      if (!newNodes) newNodes = preprocessFn.call(this, node)
      return newNodes
    }
  } else {
    provider.preprocessNode = preprocessFn
  }
}

export function addBindingHandlerCreator(
  matchRegex: RegExp,
  callbackFn: (matches: RegExpMatchArray, bindingKey: string) => any
) {
  const oldGetHandler = ko.getBindingHandler
  ko.getBindingHandler = (bindingKey) => {
    let match: RegExpMatchArray | null
    return (
      oldGetHandler(bindingKey) ||
      ((match = bindingKey.match(matchRegex)) && callbackFn(match, bindingKey))
    )
  }
}
