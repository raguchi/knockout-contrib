import ko from 'knockout'
import { chainPreprocessor, getOrCreateHandler } from './utils'

declare module 'knockout' {
  // tslint:disable-next-line:interface-name
  interface BindingHandler<T> {
    _propertyPreprocessors?: {
      [k: string]: (...args: any[]) => any
    }
  }
}

// Attach a preprocess function to a specific property of a binding. This allows you to
// preprocess binding "options" using the same preprocess functions that work for bindings.
export function addBindingPropertyPreprocessor(
  bindingKeyOrHandler: string,
  property: string,
  preprocessFn: (...args: any[]) => any
) {
  const handler = getOrCreateHandler(bindingKeyOrHandler)
  if (!handler._propertyPreprocessors) {
    // Initialize the binding preprocessor
    chainPreprocessor(handler, 'preprocess', propertyPreprocessor)
    handler._propertyPreprocessors = {}
  }
  // Add the property preprocess function
  chainPreprocessor(handler._propertyPreprocessors, property, preprocessFn)
}

// In order to preprocess a binding property, we have to preprocess the binding itself.
// This preprocess function splits up the binding value and runs each property's preprocess
// function if it's set.
function propertyPreprocessor(
  this: ko.BindingHandler<any>,
  value: string,
  binding: string,
  addBinding: any
) {
  if (value.charAt(0) !== '{') return value

  const subBindings = ko.expressionRewriting.parseObjectLiteral(value)
  const resultStrings: string[] = []
  const propertyPreprocessors = this._propertyPreprocessors || {}
  ko.utils.arrayForEach(subBindings, (keyValue) => {
    const prop = keyValue.key as string
    let propVal = keyValue.value
    if (propertyPreprocessors[prop]) {
      propVal = propertyPreprocessors[prop](propVal, prop, addBinding)
    }
    if (propVal) {
      resultStrings.push("'" + prop + "':" + propVal)
    }
  })
  return '{' + resultStrings.join(',') + '}'
}
