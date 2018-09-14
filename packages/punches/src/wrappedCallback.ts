import { addBindingPreprocessor } from './utils'

// Wrap a callback function in an anonymous function so that it is called with the appropriate
// "this" value.
export function wrappedCallbackPreprocessor(val: string) {
  // Matches either an isolated identifier or something ending with a property accessor
  if (/^([$_a-z][$\w]*|.+(\.\s*[$_a-z][$\w]*|\[.+\]))$/i.test(val)) {
    return 'function(_x,_y,_z){return(' + val + ')(_x,_y,_z);}'
  } else {
    return val
  }
}

// Set the wrappedCallback preprocessor for a specific binding
export function enableWrappedCallback(bindingKeyOrHandler: string) {
  addBindingPreprocessor(bindingKeyOrHandler, wrappedCallbackPreprocessor)
}
