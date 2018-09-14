import ko from 'knockout'

import {
  addDefaultNamespacedBindingPreprocessor,
  autoNamespacedPreprocessor,
  enableAutoNamespacedSyntax
} from '../src/namespacedBinding'

let testNode: HTMLDivElement

beforeEach(() => {
  if (ko.bindingHandlers.a) delete ko.bindingHandlers.a
  if (ko.bindingHandlers['a.b']) delete ko.bindingHandlers['a.b']
  if (ko.bindingHandlers['a.c']) delete ko.bindingHandlers['a.c']
  testNode = document.createElement('div')
})

describe('Namespaced dynamic bindings', () => {
  it('Should be able to set and use binding handlers with x.y syntax', () => {
    let initCalls = 0
    ko.bindingHandlers['a.b'] = {
      init(element, valueAccessor) {
        if (valueAccessor()) initCalls++
      }
    }
    testNode.innerHTML = "<div data-bind='a.b: true'></div>"
    ko.applyBindings(null, testNode)
    expect(initCalls).toEqual(1)
  })

  it("Should call 'x' handler with 'y' as object key", () => {
    const obs = ko.observable()
    let lastSubKey = ''
    ko.bindingHandlers.a = {
      update(element, valueAccessor) {
        const value = valueAccessor()
        for (const key in value) if (ko.unwrap(value[key])) lastSubKey = key
      }
    }
    testNode.innerHTML = "<div data-bind='a.b: true, a.c: obs'></div>"
    ko.applyBindings({ obs }, testNode)
    expect(lastSubKey).toEqual('b')

    // update observable to true so a.c binding gets updated
    obs(true)
    expect(lastSubKey).toEqual('c')
  })

  it('Should use handler returned by getNamespacedHandler', () => {
    const observable = ko.observable()
    let lastSubKey = ''
    ko.bindingHandlers.a = {
      getNamespacedHandler(subKey) {
        return {
          update(element, valueAccessor) {
            if (ko.unwrap(valueAccessor())) lastSubKey = subKey
          }
        }
      }
    }
    testNode.innerHTML = "<div data-bind='a.b: true, a.c: myObservable'></div>"
    ko.applyBindings({ myObservable: observable }, testNode)
    expect(lastSubKey).toEqual('b')

    // update observable to true so a.c binding gets updated
    observable(true)
    expect(lastSubKey).toEqual('c')
  })

  it('Should support virtual elements if base binding supports it', () => {
    let lastSubKey = ''
    ko.bindingHandlers.a = {
      update(element, valueAccessor) {
        const value = valueAccessor()
        for (const key in value) if (ko.unwrap(value[key])) lastSubKey = key
      }
    }
    ko.virtualElements.allowedBindings.a = true

    testNode.innerHTML = 'x <!-- ko a.b: true --><!--/ko-->'
    ko.applyBindings(null, testNode)
    expect(lastSubKey).toEqual('b')
  })

  it('Should work through ko.applyBindingsToNode', () => {
    let lastSubKey = ''
    ko.bindingHandlers.a = {
      update(element, valueAccessor) {
        const value = valueAccessor()
        for (const key in value) if (ko.unwrap(value[key])) lastSubKey = key
      }
    }

    testNode.innerHTML = '<div></div>'
    ko.applyBindingsToNode(testNode.childNodes[0], { 'a.b': true }, null)
    ko.applyBindings(null, testNode)
    expect(lastSubKey).toEqual('b')
  })

  it('Should update only the binding that needs it', () => {
    const observable = ko.observable('A')
    const updateCounts = [0, 0, 0]
    ko.bindingHandlers.test = {
      update(element, valueAccessor: () => number[]) {
        const value = valueAccessor()
        for (const key in value) if (ko.unwrap(value[key])) updateCounts[key]++
      }
    }
    testNode.innerHTML =
      "<div data-bind='test.1: myObservable, test.2: true'></div>"

    ko.applyBindings({ myObservable: observable }, testNode)
    expect(updateCounts[1]).toEqual(1)
    expect(updateCounts[2]).toEqual(1)

    // update the observable and check that only the first binding was updated
    observable('B')
    expect(updateCounts[1]).toEqual(2)
    expect(updateCounts[2]).toEqual(1)
  })

  it('Should be able to supply event handler using event.type', () => {
    const model = { clickCalled: false }
    testNode.innerHTML =
      "<button data-bind='event.click: () => { clickCalled = true; }'>hey</button>"
    ko.applyBindings(model, testNode)
    ko.utils.triggerEvent(testNode.childNodes[0] as HTMLElement, 'click')
    expect(model.clickCalled).toEqual(true)
  })

  it('Should be able to set CSS class using css.classname', () => {
    const observable1 = ko.observable()
    testNode.innerHTML =
      "<div data-bind='css.myRule: someModelProperty'>Hallo</div>"
    ko.applyBindings({ someModelProperty: observable1 }, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.className).toEqual('')
    observable1(true)
    expect(el.className).toEqual('myRule')
  })

  it('Should be able to set CSS style using style.stylename', () => {
    const myObservable: ko.Observable<string | undefined> = ko.observable('red')
    testNode.innerHTML =
      "<div data-bind='style.backgroundColor: colorValue'>Hallo</div>"
    ko.applyBindings({ colorValue: myObservable }, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.style.backgroundColor).toBe('red')
    myObservable('green')
    expect(el.style.backgroundColor).toBe('green')
    myObservable(undefined)
    expect(el.style.backgroundColor).toEqual('')
  })

  it('Should be able to set attribute using attr.name', () => {
    const model = { myprop: ko.observable('initial value') }
    testNode.innerHTML = "<div data-bind='attr.someAttrib: myprop'></div>"
    ko.applyBindings(model, testNode)
    const el = testNode.childNodes[0] as HTMLElement
    expect(el.getAttribute('someAttrib')).toEqual('initial value')

    // Change the observable; observe it reflected in the DOM
    model.myprop('new value')
    expect(el.getAttribute('someAttrib')).toEqual('new value')
  })
})

describe('Auto namespaced preprocessor', () => {
  let bindings: string[] = []
  function addBinding(key: string, val: string) {
    bindings.push(key + ':' + val)
  }
  beforeEach(() => {
    bindings = []
  })

  it('Should convert x: {y: val} into x.y: val', () => {
    expect(
      autoNamespacedPreprocessor('{y: val}', 'x', addBinding)
    ).toBeUndefined()
    expect(bindings).toEqual(['x.y:val'])
  })

  it('Should convert multiple sub-values to multiple top-level bindings', () => {
    expect(
      autoNamespacedPreprocessor('{y: val1, z: val2}', 'x', addBinding)
    ).toBeUndefined()
    expect(bindings).toEqual(['x.y:val1', 'x.z:val2'])
  })

  it('Should do nothing if the value is not in {x:y} syntax', () => {
    expect(autoNamespacedPreprocessor('val1', 'x', addBinding)).toEqual('val1')
    expect(bindings).toEqual([])
  })
})

describe('Auto namespaced bindings', () => {
  it('Should create and call dynamic binding handler for each sub-value in binding', () => {
    const observable = ko.observable()
    let lastSubKey = ''
    ko.bindingHandlers.a = {
      getNamespacedHandler(subKey) {
        return {
          update(element, valueAccessor) {
            if (ko.unwrap(valueAccessor())) lastSubKey = subKey
          }
        }
      }
    }
    enableAutoNamespacedSyntax('a')
    testNode.innerHTML = "<div data-bind='a: {b: true, c: myObservable}'></div>"
    ko.applyBindings({ myObservable: observable }, testNode)
    expect(lastSubKey).toEqual('b')

    // update observable to true so a.c binding gets updated
    observable(true)
    expect(lastSubKey).toEqual('c')
  })
})

describe('Default namespaced binding preprocessor', () => {
  it('Should run preprocessor for dynamically created binding', () => {
    let value
    ko.bindingHandlers.a = {
      getNamespacedHandler(subKey) {
        return {
          init(element, valueAccessor) {
            value = valueAccessor()
          }
        }
      }
    }
    addDefaultNamespacedBindingPreprocessor('a', () => '"new value"')
    testNode.innerHTML = '<div data-bind=\'a.b: "old value"\'></div>'
    ko.applyBindings(null, testNode)
    expect(value).toEqual('new value')
  })
})
