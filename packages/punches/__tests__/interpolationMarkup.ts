import ko from 'knockout'
import {
  attributeInterpolationMarkupPreprocessor,
  interpolationMarkupPreprocessor,
  enableInterpolationMarkup,
  enableAttributeInterpolationMarkup
} from '../src/interpolationMarkup'

declare global {
  namespace jest {
    // tslint:disable-next-line:interface-name
    interface Matchers<R> {
      toHaveNodeTypes(nodeTypes: NodeTypes[]): boolean
    }
  }
}

enum NodeTypes {
  Text = 3,
  Comment = 8
}

expect.extend({
  toHaveNodeTypes(nodes: Node[], expectedTypes: NodeTypes[]) {
    const actualTypes = nodes.map((n) => n.nodeType)
    const pass = this.equals(actualTypes, expectedTypes)
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(actualTypes)} ${
          pass ? 'not ' : ''
        }to equal ${JSON.stringify(expectedTypes)}`
    }
  }
})

let testNode: HTMLDivElement
beforeEach(() => {
  testNode = document.createElement('div')
  enableInterpolationMarkup()
  enableAttributeInterpolationMarkup()
})

const savePreprocessNode = ko.bindingProvider.instance.preprocessNode
afterEach(() => {
  ko.bindingProvider.instance.preprocessNode = savePreprocessNode
})

describe('Interpolation Markup preprocessor', () => {
  it('Should do nothing when there are no expressions', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some text')
    )
    expect(result).toBeUndefined()
  })

  it('Should do nothing when empty', () => {
    const result = interpolationMarkupPreprocessor(document.createTextNode(''))
    expect(result).toBeUndefined()
  })

  it('Should not parse unclosed binding', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some {{ text')
    )
    expect(result).toBeUndefined()
  })

  it('Should not parse unopened binding', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some }} text')
    )
    expect(result).toBeUndefined()
  })

  it('Should create binding from {{...}} expression', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some {{ expr }} text')
    ) as Node[]
    expect(result).toHaveNodeTypes([
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text
    ])
    expect(result[1].nodeValue).toEqual('ko text:expr')
    expect(result[2].nodeValue).toEqual('/ko')
  })

  it('Should ignore unmatched delimiters', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some {{ expr }} }} text')
    ) as Node[]
    expect(result).toHaveNodeTypes([
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text
    ])
    expect(result[1].nodeValue).toEqual('ko text:expr }}')
  })

  it('Should support two expressions', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('some {{ expr1 }} middle {{ expr2 }} text')
    ) as Node[]
    expect(result).toHaveNodeTypes([
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text
    ])
    expect(result[1].nodeValue).toEqual('ko text:expr1')
    expect(result[4].nodeValue).toEqual('ko text:expr2')
  })

  it('Should skip empty text', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode('{{ expr1 }}{{ expr2 }}')
    ) as Node[]
    expect(result).toHaveNodeTypes([
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Comment
    ])
    expect(result[0].nodeValue).toEqual('ko text:expr1')
    expect(result[2].nodeValue).toEqual('ko text:expr2')
  })

  it('Should support more than two expressions', () => {
    const result = interpolationMarkupPreprocessor(
      document.createTextNode(
        'x {{ expr1 }} y {{ expr2 }} z {{ exprNodeTypes.Text }}'
      )
    ) as Node[]
    expect(result).toHaveNodeTypes([
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment,
      NodeTypes.Text,
      NodeTypes.Comment,
      NodeTypes.Comment
    ])
    expect(result[1].nodeValue).toEqual('ko text:expr1')
    expect(result[4].nodeValue).toEqual('ko text:expr2')
    expect(result[7].nodeValue).toEqual('ko text:exprNodeTypes.Text')
  })

  describe('Using unescaped HTML syntax', () => {
    it('Should not parse unclosed binding', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{{ text')
      )
      expect(result).toBeUndefined()
    })

    it('Should not parse unopened binding', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some }}} text')
      )
      expect(result).toBeUndefined()
    })

    it('Should create binding from {{{...}}} expression', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{{ expr }}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko html:expr')
      expect(result[2].nodeValue).toEqual('/ko')
    })

    it('Should ignore unmatched delimiters', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{{ expr }}} }}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko html:expr }}}')
    })

    it('Should support two expressions', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{{ expr1 }}} middle {{{ expr2 }}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko html:expr1')
      expect(result[4].nodeValue).toEqual('ko html:expr2')
    })
  })

  describe('Using block syntax', () => {
    it('Should create binding from {{#....}}{{/....}} expression', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{#binding:value}}{{/binding}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko binding:value')
      expect(result[2].nodeValue).toEqual('/ko')
    })

    it('Should tolerate spaces around expressions from {{ #.... }}{{ /.... }} expression', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{ #binding:value }}{{ /binding }} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko binding:value')
      expect(result[2].nodeValue).toEqual('/ko')
    })

    it('Should tolerate spaces around constious components', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode(
          'some {{# binding : value }}{{/ binding }} text'
        )
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko  binding : value')
      expect(result[2].nodeValue).toEqual('/ko')
    })

    it('Should insert semicolon if missing', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{#binding value}}{{/binding}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko binding:value')
    })

    it('Should not insert semicolon if binding has no value', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{#binding}}{{/binding}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko binding')
    })

    it('Should support self-closing syntax', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{#binding:value/}} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko binding:value')
      expect(result[2].nodeValue).toEqual('/ko')
    })

    it('Should tolerate space around self-closing syntax', () => {
      const result = interpolationMarkupPreprocessor(
        document.createTextNode('some {{ # binding:value / }} text')
      ) as Node[]
      expect(result).toHaveNodeTypes([
        NodeTypes.Text,
        NodeTypes.Comment,
        NodeTypes.Comment,
        NodeTypes.Text
      ])
      expect(result[1].nodeValue).toEqual('ko  binding:value ')
      expect(result[2].nodeValue).toEqual('/ko')
    })
  })
})

describe('Interpolation Markup bindings', () => {
  it('Should replace {{...}} expression with virtual text binding', () => {
    testNode.innerHTML = "hello {{'name'}}!"
    ko.applyBindings(null, testNode)
    expect(testNode.textContent).toBe('hello name!')
    expect(testNode.innerHTML).toBe(
      "hello <!--ko text:'name'-->name<!--/ko-->!"
    )
  })

  it('Should replace multiple expressions', () => {
    testNode.innerHTML = "hello {{'name'}}{{'!'}}"
    ko.applyBindings(null, testNode)
    expect(testNode.textContent).toBe('hello name!')
  })

  it('Should support any content of expression, including functions and {{}}', () => {
    testNode.innerHTML = "hello {{ (function(){return '{{name}}'}()) }}!"
    ko.applyBindings(null, testNode)
    expect(testNode.textContent).toBe('hello {{name}}!')
  })

  it('Should ignore unmatched }} and {{', () => {
    testNode.innerHTML = "hello }}'name'{{'!'}}{{"
    ko.applyBindings(null, testNode)
    expect(testNode.textContent).toBe("hello }}'name'!{{")
  })

  it('Should update when observable changes', () => {
    testNode.innerHTML = 'The best {{what}}.'
    const observable = ko.observable('time')
    ko.applyBindings({ what: observable }, testNode)
    expect(testNode.textContent).toBe('The best time.')
    observable('fun')
    expect(testNode.textContent).toBe('The best fun.')
  })

  // REMOVED
  // it('Should be able to override wrapExpression to define a different set of elements', () => {
  //   this.after(() => {
  //     ko.punches.interpolationMarkup.wrapExpression = originalWrapExpresssion
  //   })

  //   ko.punches.interpolationMarkup.wrapExpression = function(
  //     expressionText,
  //     node
  //   ) {
  //     return originalWrapExpresssion(
  //       '"--" + ' + expressionText + ' + "--"',
  //       node
  //     )
  //   }

  //   testNode.innerHTML = "hello {{'name'}}!"
  //   ko.applyBindings(null, testNode)
  //   expect(testNode).toContainText('hello --name--!')
  // })

  it('Should not modify the content of <textarea> tags', () => {
    testNode.innerHTML =
      "<p>Hello</p><textarea>{{'name'}}</textarea><p>Goodbye</p>"
    ko.applyBindings(null, testNode)
    expect(testNode.innerHTML).toBe(
      "<p>Hello</p><textarea>{{'name'}}</textarea><p>Goodbye</p>"
    )
  })

  it('Should not modify the content of <script> tags', () => {
    testNode.innerHTML = '<p>Hello</p><script>{{return}}</script><p>Goodbye</p>'
    ko.applyBindings(null, testNode)
    expect(testNode.innerHTML).toBe(
      '<p>Hello</p><script>{{return}}</script><p>Goodbye</p>'
    )
  })

  // script tags not enabled by default by jsdom, with no way to (easily) enable for jest
  //
  // it('Should work when used in template declared using <script>', () => {
  //   testNode.innent =
  //     "<div data-bind='template: \"tmpl\"'></div><script type='text/html' id='tmpl'>{{'name'}}</script>"
  //   ko.applyBindings(null, testNode)
  //   expect(testNode.childNodes[0]).toContainText('name')
  // })

  // it('Should work when used in template declared using <textarea>', () => {
  //   testNode.innerHTML =
  //     "<div data-bind='template: \"tmpl\"'></div><textarea id='tmpl'>{{'name'}}</textarea>"
  //   ko.applyBindings(null, testNode)
  //   expect(testNode.childNodes[0].textContent).toBe('name')
  // })

  describe('Using unescaped HTML syntax', () => {
    it('Should replace {{{...}}} expression with virtual html binding', () => {
      testNode.textContent = "hello {{{'<b>name</b>'}}}!"
      ko.applyBindings(null, testNode)
      expect(testNode.textContent).toBe('hello name!')
      expect(testNode.innerHTML).toBe(
        "hello <!--ko html:'<b>name</b>'--><b>name</b><!--/ko-->!"
      )
      expect(testNode.childNodes[2].nodeName.toLowerCase()).toEqual('b')
    })

    it('Should support mix of escaped and unescape expressions', () => {
      testNode.textContent = "hello {{{'<b>name</b>'}}}{{'!'}}"
      ko.applyBindings(null, testNode)
      expect(testNode.textContent).toBe('hello name!')
      expect(testNode.innerHTML).toBe(
        "hello <!--ko html:'<b>name</b>'--><b>name</b><!--/ko--><!--ko text:'!'-->!<!--/ko-->"
      )
      expect(testNode.childNodes[2].nodeName.toLowerCase()).toEqual('b')
    })

    it('Should support any content of expression, including functions and {{{}}}', () => {
      testNode.textContent =
        "hello {{{ (function(){return '<b>{{{name}}}</b>'}()) }}}!"
      ko.applyBindings(null, testNode)
      expect(testNode.textContent).toBe('hello {{{name}}}!')
      expect(testNode.childNodes[2].nodeName.toLowerCase()).toEqual('b')
    })

    it('Should ignore unmatched }}} and {{{', () => {
      testNode.textContent = "hello }}}'name'{{{'!'}}}{{{"
      ko.applyBindings(null, testNode)
      expect(testNode.textContent).toBe("hello }}}'name'!{{{")
    })

    it('Should update when observable changes', () => {
      testNode.textContent = 'The best {{{what}}}.'
      const observable = ko.observable('<b>time</b>')
      ko.applyBindings({ what: observable }, testNode)
      expect(testNode.textContent).toBe('The best time.')
      expect(testNode.childNodes[2].nodeName.toLowerCase()).toEqual('b')
      observable('<i>fun</i>')
      expect(testNode.textContent).toBe('The best fun.')
      expect(testNode.childNodes[2].nodeName.toLowerCase()).toEqual('i')
    })
  })

  describe('Using block syntax', () => {
    it('Should support "with"', () => {
      testNode.innerHTML =
        '<div><h1>{{title}}</h1>{{#with: story}}<div>{{{intro}}}</div><div>{{{body}}}</div>{{/with}}</div>'
      ko.applyBindings(
        {
          title: 'First Post',
          story: {
            intro: 'Before the jump',
            body: 'After the jump'
          }
        },
        testNode
      )
      expect(testNode.innerHTML).toBe(
        '<div><h1><!--ko text:title-->First Post<!--/ko--></h1><!--ko with: story--><div><!--ko html:intro-->Before the jump<!--/ko--></div><div><!--ko html:body-->After the jump<!--/ko--></div><!--/ko--></div>'
      )
    })

    it('Should support "foreach"', () => {
      testNode.innerHTML =
        '<ul>{{#foreach: people}}<li>{{$data}}</li>{{/foreach}}</ul>'
      ko.applyBindings(
        {
          people: ['Bill Gates', 'Steve Jobs', 'Larry Ellison']
        },
        testNode
      )
      expect(testNode.innerHTML).toBe(
        '<ul><!--ko foreach: people--><li><!--ko text:$data-->Bill Gates<!--/ko--></li><li><!--ko text:$data-->Steve Jobs<!--/ko--></li><li><!--ko text:$data-->Larry Ellison<!--/ko--></li><!--/ko--></ul>'
      )
    })

    it('Should support nested blocks', () => {
      testNode.innerHTML =
        '<ul>{{#foreach: people}} {{#if: $data}}<li>{{$data}}</li>{{/if}}{{/foreach}}</ul>'
      ko.applyBindings(
        {
          people: ['Bill Gates', null, 'Steve Jobs', 'Larry Ellison']
        },
        testNode
      )
      expect(testNode.innerHTML).toBe(
        '<ul><!--ko foreach: people--> <!--ko if: $data--><li><!--ko text:$data-->Bill Gates<!--/ko--></li><!--/ko--> <!--ko if: $data--><!--/ko--> <!--ko if: $data--><li><!--ko text:$data-->Steve Jobs<!--/ko--></li><!--/ko--> <!--ko if: $data--><li><!--ko text:$data-->Larry Ellison<!--/ko--></li><!--/ko--><!--/ko--></ul>'
      )
    })

    it('Should work without the colon', () => {
      testNode.innerHTML =
        '<ul>{{#foreach people}}<li>{{$data}}</li>{{/foreach}}</ul>'
      ko.applyBindings(
        {
          people: ['Bill Gates', 'Steve Jobs', 'Larry Ellison']
        },
        testNode
      )
      expect(testNode.innerHTML).toBe(
        '<ul><!--ko foreach:people--><li><!--ko text:$data-->Bill Gates<!--/ko--></li><li><!--ko text:$data-->Steve Jobs<!--/ko--></li><li><!--ko text:$data-->Larry Ellison<!--/ko--></li><!--/ko--></ul>'
      )
    })

    it('Should support self-closing blocks', () => {
      testNode.innerHTML = "hello {{#text 'name'/}}"
      ko.applyBindings(null, testNode)
      expect(testNode.textContent).toBe('hello name')
    })
  })
})

describe('Attribute Interpolation Markup preprocessor', () => {
  it('Should do nothing when there are no expressions', () => {
    testNode.setAttribute('title', 'some text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('some text')
    expect(testNode.getAttribute('data-bind')).toBe(null)
  })

  it('Should do nothing when empty', () => {
    testNode.setAttribute('title', '')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toBe(null)
  })

  it('Should not parse unclosed binding', () => {
    testNode.setAttribute('title', 'some {{text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('some {{text')
    expect(testNode.getAttribute('data-bind')).toBe(null)
  })

  it('Should not parse unopened binding', () => {
    testNode.setAttribute('title', 'some}} text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('some}} text')
    expect(testNode.getAttribute('data-bind')).toBe(null)
  })

  it('Should create binding from {{...}} expression', () => {
    testNode.setAttribute('title', 'some {{expr}} text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:""+"some "+ko.unwrap(expr)+" text"'
    )
  })

  it('Should ignore unmatched delimiters', () => {
    testNode.setAttribute('title', 'some {{expr1}}expr2}} text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:""+"some "+ko.unwrap(expr1}}expr2)+" text"'
    )
  })

  it('Should support two expressions', () => {
    testNode.setAttribute('title', 'some {{expr1}} middle {{expr2}} text')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:""+"some "+ko.unwrap(expr1)+" middle "+ko.unwrap(expr2)+" text"'
    )
  })

  it('Should skip empty text', () => {
    testNode.setAttribute('title', '{{expr1}}{{expr2}}')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:""+ko.unwrap(expr1)+ko.unwrap(expr2)'
    )
  })

  it('Should support more than two expressions', () => {
    testNode.setAttribute(
      'title',
      'x {{expr1}} y {{expr2}} z {{exprNodeTypes.Text}}'
    )
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:""+"x "+ko.unwrap(expr1)+" y "+ko.unwrap(expr2)+" z "+ko.unwrap(exprNodeTypes.Text)'
    )
  })

  it('Should create simple binding for single expression', () => {
    testNode.setAttribute('title', '{{expr1}}')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:expr1')
  })

  it('Should append to existing data-bind', () => {
    testNode.setAttribute('title', '{{expr1}}')
    testNode.setAttribute('data-bind', 'text:expr2')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.title).toEqual('')
    expect(testNode.getAttribute('data-bind')).toEqual(
      'text:expr2,attr.title:expr1'
    )
  })

  it('Should not match expressions in data-bind', () => {
    testNode.setAttribute('data-bind', "text:'{{xyz}}'")
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.getAttribute('data-bind')).toEqual("text:'{{xyz}}'")
  })

  it('Should support expressions in multiple attributes', () => {
    testNode.setAttribute('title', '{{expr1}}')
    testNode.setAttribute('class', 'test') // won't be in data-bind
    testNode.setAttribute('id', '{{expr2}}')
    testNode.setAttribute('data-test', '{{exprNodeTypes.Text}}')
    attributeInterpolationMarkupPreprocessor(testNode)
    expect(testNode.getAttribute('data-bind')).toEqual(
      'attr.title:expr1,attr.id:expr2,attr.data-test:exprNodeTypes.Text'
    ) // the order shouldn't matter
  })

  it('Should convert value and checked attributes to two-way bindings', () => {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('checked', '{{expr2}}')
    input.setAttribute('value', '{{expr1}}')
    attributeInterpolationMarkupPreprocessor(input)
    expect(input.getAttribute('data-bind')).toEqual('checked:expr2,value:expr1')
  })

  //   // REMOVED
  //   // it('Should support custom attribute binding using "attributeBinding" extension point', () => {
  //   //   const originalAttributeBinding =
  //   //     ko.punches.attributeInterpolationMarkup.attributeBinding
  //   //   this.after(() => {
  //   //     ko.punches.attributeInterpolationMarkup.attributeBinding = originalAttributeBinding
  //   //   })
  //   //
  //   //   ko.punches.attributeInterpolationMarkup.attributeBinding = function(
  //   //     name,
  //   //     value,
  //   //     node
  //   //   ) {
  //   //     const parsedName = name.match(/^ko-(.*)$/)
  //   //     if (parsedName) {
  //   //       return originalAttributeBinding(parsedName[1], value, node)
  //   //     }
  //   //   }
  //   //   // Won't be in data-bind because it doesn't include an expression
  //   //   testNode.setAttribute('ko-class', 'test')
  //   //   // Should handle normal attributes normally
  //   //   testNode.setAttribute('title', '{{expr1}}')
  //   //   // This will use the custom handler
  //   //   testNode.setAttribute('ko-id', '{{expr2}}')
  //   //   attributeInterpolationMarkupPreprocessor(testNode)
  //   //   expect(testNode.getAttribute('data-bind')).toEqual(
  //   //     'attr.title:expr1,attr.id:expr2'
  //   //   )
  //   // })
})

describe('Attribute Interpolation Markup bindings', () => {
  it('Should replace {{...}} expression in attribute', () => {
    testNode.innerHTML = `<div title="hello {{'name'}}!"></div>`
    ko.applyBindings(null, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.title).toBe('hello name!')
  })

  it('Should replace multiple expressions', () => {
    testNode.innerHTML = '<div title=\'hello {{"name"}}{{"!"}}\'></div>'
    ko.applyBindings(null, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.title).toEqual('hello name!')
  })

  it('Should support any content of expression, including functions and {{}}', () => {
    testNode.innerHTML =
      '<div title=\'hello {{ (function(){return "{{name}}"}()) }}!\'></div>'
    ko.applyBindings(null, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.title).toEqual('hello {{name}}!')
  })

  it('Should properly handle quotes in text sections', () => {
    testNode.innerHTML =
      '<div title=\'This is "great" {{"fun"}} with &apos;friends&apos;\'></div>'
    ko.applyBindings(null, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.title).toEqual('This is "great" fun with \'friends\'')
  })

  it('Should ignore unmatched }} and {{', () => {
    testNode.innerHTML = '<div title=\'hello }}"name"{{"!"}}{{\'></div>'
    ko.applyBindings(null, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.title).toEqual('hello }}"name"!{{')
  })

  it('Should support expressions in multiple attributes', () => {
    testNode.innerHTML =
      "<div title='{{title}}' id='{{id}}' class='test class' data-test='hello {{\"name\"}}!' data-bind='text:content'></div>"
    ko.applyBindings(
      { title: 'the title', id: 'test id', content: 'content' },
      testNode
    )
    const el = testNode.childNodes[0] as HTMLElement
    expect(testNode.textContent).toBe('content')
    expect(el.title).toEqual('the title')
    expect(el.id).toEqual('test id')
    expect(el.className).toEqual('test class')
    expect(el.getAttribute('data-test')).toEqual('hello name!')
  })

  it('Should update when observable changes', () => {
    testNode.innerHTML = "<div title='The best {{what}}.'></div>"
    const observable = ko.observable('time')
    const el = testNode.childNodes[0] as HTMLElement
    ko.applyBindings({ what: observable }, testNode)
    expect(el.title).toEqual('The best time.')
    observable('fun')
    expect(el.title).toEqual('The best fun.')
  })

  it('Should convert value attribute to two-way binding', () => {
    testNode.innerHTML = "<input value='{{value}}'/>"
    const observable = ko.observable('default value')
    const el = testNode.childNodes[0] as HTMLInputElement
    ko.applyBindings({ value: observable }, testNode)
    expect(el.value).toEqual('default value')

    el.value = 'user-enterd value'
    ko.utils.triggerEvent(el, 'change')
    expect(observable()).toEqual('user-enterd value')
  })

  it('Should convert checked attribute to two-way binding', () => {
    testNode.innerHTML = "<input type='checkbox' checked='{{isChecked}}'/>"
    const observable = ko.observable(true)
    const el = testNode.childNodes[0] as HTMLInputElement
    ko.applyBindings({ isChecked: observable }, testNode)
    expect(el.checked).toBe(true)

    el.click()
    expect(observable()).toBe(false)
  })
})
