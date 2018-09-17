import * as ko from 'knockout'

import {
  enableInterpolationMarkup,
  enableAttributeInterpolationMarkup,
  interpolationMarkupPreprocessor
} from './interpolationMarkup'
import {
  addDefaultNamespacedBindingPreprocessor,
  autoNamespacedPreprocessor,
  enableAutoNamespacedSyntax
} from './namespacedBinding'
import { addBindingPropertyPreprocessor } from './preprocessBindingProperty'
import { enableTextFilter, filterPreprocessor } from './textFilter'
import {
  enableWrappedCallback,
  wrappedCallbackPreprocessor
} from './wrappedCallback'
import { addBindingPreprocessor } from './utils'

export {
  /**
   * "Enable" functions
   */
  enableInterpolationMarkup,
  enableAttributeInterpolationMarkup,
  enableAutoNamespacedSyntax,
  enableTextFilter,
  enableWrappedCallback,
  /**
   * Preprocessors
   */
  autoNamespacedPreprocessor,
  filterPreprocessor,
  interpolationMarkupPreprocessor,
  wrappedCallbackPreprocessor,
  /**
   * Exposed Utils
   */
  addBindingPreprocessor,
  addBindingPropertyPreprocessor,
  addDefaultNamespacedBindingPreprocessor
}

export function enableAll() {
  // Enable interpolation markup
  enableInterpolationMarkup()
  enableAttributeInterpolationMarkup()

  // Enable auto-namespacing of attr, css, event, and style
  enableAutoNamespacedSyntax('attr')
  enableAutoNamespacedSyntax('css')
  enableAutoNamespacedSyntax('event')
  enableAutoNamespacedSyntax('style')

  // Make sure that Knockout knows to bind checked after attr.value (see #40)
  ko.bindingHandlers.checked.after.push('attr.value')

  // Enable filter syntax for text, html, and attr
  enableTextFilter('text')
  enableTextFilter('html')
  addDefaultNamespacedBindingPreprocessor('attr', filterPreprocessor)

  // Enable wrapped callbacks for click, submit, event, optionsAfterRender, and template options
  enableWrappedCallback('click')
  enableWrappedCallback('submit')
  enableWrappedCallback('optionsAfterRender')
  addDefaultNamespacedBindingPreprocessor('event', wrappedCallbackPreprocessor)
  addBindingPropertyPreprocessor(
    'template',
    'beforeRemove',
    wrappedCallbackPreprocessor
  )
  addBindingPropertyPreprocessor(
    'template',
    'afterAdd',
    wrappedCallbackPreprocessor
  )
  addBindingPropertyPreprocessor(
    'template',
    'afterRender',
    wrappedCallbackPreprocessor
  )
}
