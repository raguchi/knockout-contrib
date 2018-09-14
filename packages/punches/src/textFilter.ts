import ko from 'knockout'
import { addBindingPreprocessor } from './utils'

declare module 'knockout' {
  export const filters: { [name: string]: TextFilter }
  export type TextFilter = (text: string, ...args: any[]) => string
}

// @ts-ignore
ko.filters = {}

// Convert input in the form of `expression | filter1 | filter2:arg1:arg2` to a function call format
// with filters accessed as ko.filters.filter1, etc.
export function filterPreprocessor(input: string) {
  // Check if the input contains any | characters; if not, just return
  if (input.indexOf('|') === -1) return input

  // Split the input into tokens, in which | and : are individual tokens, quoted strings are ignored, and all tokens are space-trimmed
  const tokens = input.match(
    /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\|\||[|:]|[^\s|:"'][^|:"']*[^\s|:"']|[^\s|:"']/g
  )
  if (tokens && tokens.length > 1) {
    // Append a line so that we don't need a separate code block to deal with the last item
    tokens.push('|')
    input = tokens[0]

    let lastToken = tokens.shift()
    let inFilters = false
    let nextIsFilter = false
    for (const token of tokens) {
      if (token === '|') {
        if (inFilters) {
          if (lastToken === ':') input += 'undefined'
          input += ')'
        }
        nextIsFilter = true
        inFilters = true
      } else {
        if (nextIsFilter) {
          input = "ko.filters['" + token + "'](" + input
        } else if (inFilters && token === ':') {
          if (lastToken === ':') input += 'undefined'
          input += ','
        } else {
          input += token
        }
        nextIsFilter = false
      }
      lastToken = token
    }
  }
  return input
}

// Set the filter preprocessor for a specific binding
export function enableTextFilter(bindingKeyOrHandler: string) {
  addBindingPreprocessor(bindingKeyOrHandler, filterPreprocessor)
}

/**
 * @TODO extract these into separate packages
 */
// Convert value to uppercase
// filters.uppercase = function(value) {
//     return String.prototype.toUpperCase.call(ko_unwrap(value));
// };

// // Convert value to lowercase
// filters.lowercase = function(value) {
//     return String.prototype.toLowerCase.call(ko_unwrap(value));
// };

// // Return default value if the input value is empty or null
// filters['default'] = function (value, defaultValue) {
//     value = ko_unwrap(value);
//     if (typeof value === "function") {
//         return value;
//     }
//     if (typeof value === "string") {
//         return trim(value) === '' ? defaultValue : value;
//     }
//     return value == null || value.length == 0 ? defaultValue : value;
// };

// // Return the value with the search string replaced with the replacement string
// filters.replace = function(value, search, replace) {
//     return String.prototype.replace.call(ko_unwrap(value), search, replace);
// };

// filters.fit = function(value, length, replacement, trimWhere) {
//     value = ko_unwrap(value);
//     if (length && ('' + value).length > length) {
//         replacement = '' + (replacement || '...');
//         length = length - replacement.length;
//         value = '' + value;
//         switch (trimWhere) {
//             case 'left':
//                 return replacement + value.slice(-length);
//             case 'middle':
//                 var leftLen = Math.ceil(length / 2);
//                 return value.substr(0, leftLen) + replacement + value.slice(leftLen-length);
//             default:
//                 return value.substr(0, length) + replacement;
//         }
//     } else {
//         return value;
//     }
// };

// // Convert a model object to JSON
// filters.json = function(rootObject, space, replacer) {     // replacer and space are optional
//     return ko.toJSON(rootObject, replacer, space);
// };

// // Format a number using the browser's toLocaleString
// filters.number = function(value) {
//     return (+ko_unwrap(value)).toLocaleString();
// };
