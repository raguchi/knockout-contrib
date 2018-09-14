import ko from 'knockout'
import { addNodePreprocessor } from './utils'
import { enableAutoNamespacedSyntax } from './namespacedBinding'

// Performance comparison at http://jsperf.com/markup-interpolation-comparison
function parseInterpolationMarkup(
  textToParse: string,
  outerTextCallback: (text: string) => void,
  expressionCallback: (text: string) => void
) {
  function innerParse(text: string) {
    const innerMatch = text.match(/^([\s\S]*)}}([\s\S]*?)\{\{([\s\S]*)$/)
    if (innerMatch) {
      innerParse(innerMatch[1])
      outerTextCallback(innerMatch[2])
      expressionCallback(innerMatch[3])
    } else {
      expressionCallback(text)
    }
  }
  const outerMatch = textToParse.match(/^([\s\S]*?)\{\{([\s\S]*)}}([\s\S]*)$/)
  if (outerMatch) {
    outerTextCallback(outerMatch[1])
    innerParse(outerMatch[2])
    outerTextCallback(outerMatch[3])
  }
}

export function interpolationMarkupPreprocessor(node: Node) {
  // only needs to work with text nodes
  if (
    node.nodeType === 3 &&
    node.nodeValue &&
    node.nodeValue.indexOf('{{') !== -1 &&
    (node.parentNode || ({} as HTMLElement)).nodeName !== 'TEXTAREA'
  ) {
    const nodes: Node[] = []
    function addTextNode(text: string) {
      if (text) nodes.push(document.createTextNode(text))
    }
    function wrapExpr(expressionText: string) {
      if (expressionText) {
        nodes.push.apply(nodes, wrapExpression(expressionText, node))
      }
    }
    parseInterpolationMarkup(node.nodeValue, addTextNode, wrapExpr)

    if (nodes.length) {
      if (node.parentNode) {
        for (const n of Array.from(nodes)) {
          node.parentNode.insertBefore(n, node)
        }
        node.parentNode.removeChild(node)
      }
      return nodes
    }
  }
}

if (!ko.virtualElements.allowedBindings.html) {
  // Virtual html binding
  // SO Question: http://stackoverflow.com/a/15348139
  const overridden = ko.bindingHandlers.html.update
  ko.bindingHandlers.html.update = (element, valueAccessor) => {
    if (element.nodeType === 8) {
      const html = ko.unwrap(valueAccessor())
      if (html != null) {
        const parsedNodes = ko.utils.parseHtmlFragment('' + html)
        ko.virtualElements.setDomNodeChildren(element, parsedNodes)
      } else {
        ko.virtualElements.emptyNode(element)
      }
    } else {
      overridden(element, valueAccessor)
    }
  }
  ko.virtualElements.allowedBindings.html = true
}

function wrapExpression(expressionText: string, node: Node) {
  expressionText = expressionText.trim()

  const ownerDocument = node ? node.ownerDocument : document
  const firstChar = expressionText[0]
  const lastChar = expressionText[expressionText.length - 1]
  const result = []
  let closeComment = true
  let binding: string | undefined

  if (firstChar === '#') {
    if (lastChar === '/') {
      binding = expressionText.slice(1, -1)
    } else {
      binding = expressionText.slice(1)
      closeComment = false
    }
    const matches = binding.match(/^([^,"'{}()\/:[\]\s]+)\s+([^\s:].*)/)
    if (matches) {
      binding = matches[1] + ':' + matches[2]
    }
  } else if (firstChar === '/') {
    // replace only with a closing comment
  } else if (firstChar === '{' && lastChar === '}') {
    binding = 'html:' + expressionText.slice(1, -1).trim()
  } else {
    binding = 'text:' + expressionText.trim()
  }

  if (binding) result.push(ownerDocument.createComment('ko ' + binding))
  if (closeComment) result.push(ownerDocument.createComment('/ko'))
  return result
}

export function enableInterpolationMarkup() {
  addNodePreprocessor(interpolationMarkupPreprocessor)
}

const dataBind = 'data-bind'
export function attributeInterpolationMarkupPreprocessor(node: HTMLElement) {
  if (node.nodeType === 1 && node.attributes.length) {
    let dataBindAttribute = node.getAttribute(dataBind)
    for (const attr of Array.from(node.attributes)) {
      if (
        attr.specified &&
        attr.name !== dataBind &&
        attr.value.indexOf('{{') !== -1
      ) {
        const parts: string[] = []
        let attrValue = ''
        function addText(text: string) {
          if (text) parts.push('"' + text.replace(/"/g, '\\"') + '"')
        }
        function addExpr(expressionText: string) {
          if (expressionText) {
            attrValue = expressionText
            parts.push('ko.unwrap(' + expressionText + ')')
          }
        }
        parseInterpolationMarkup(attr.value, addText, addExpr)

        if (parts.length > 1) {
          attrValue = '""+' + parts.join('+')
        }

        if (attrValue) {
          const attrName = attr.name.toLowerCase()
          const attrBinding =
            attributeBinding(attrName, attrValue, node) ||
            attributeBinding(attrName, attrValue, node)
          if (!dataBindAttribute) {
            dataBindAttribute = attrBinding
          } else {
            dataBindAttribute += ',' + attrBinding
          }
          node.setAttribute(dataBind, dataBindAttribute)
          // Using removeAttribute instead of removeAttributeNode because IE clears the
          // class if you use removeAttributeNode to remove the id.
          node.removeAttribute(attr.name)
        }
      }
    }
  }
}

function attributeBinding(name: string, value: string, node: Node) {
  if (ko.getBindingHandler(name)) {
    return name + ':' + value
  } else {
    return 'attr.' + name + ':' + value
  }
}

export function enableAttributeInterpolationMarkup() {
  enableAutoNamespacedSyntax('attr')
  addNodePreprocessor(attributeInterpolationMarkupPreprocessor)
}
