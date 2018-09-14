import ko from 'knockout'
import { addBindingPropertyPreprocessor } from '../src/preprocessBindingProperty'

describe('Preprocess binding properties', () => {
  it('Should preprocess the specified binding property', () => {
    const testNode = document.createElement('dev')
    let value = ''
    ko.bindingHandlers.a = {
      init(element, valueAccessor) {
        value = valueAccessor()
      }
    }
    addBindingPropertyPreprocessor('a', 'b', () => '"new value"')
    testNode.innerHTML =
      '<div data-bind=\'a: {b: "old value", c: "unrelated value"}\'></div>'
    ko.applyBindings(null, testNode)
    expect(value).toEqual({ b: 'new value', c: 'unrelated value' })
  })
})
