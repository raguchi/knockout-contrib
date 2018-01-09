[framework](../README.md) > [ConstructorBuilder](../classes/constructorbuilder.md)



# Class: ConstructorBuilder


See Constructor Builders concept in the README

## Index

### Methods

* [Mixin](constructorbuilder.md#mixin)



---
## Methods
<a id="mixin"></a>

### «Static» Mixin

► **Mixin**P,T1,T2(this: *`T1`*, mixin: *`function`*): `T2`



*Defined in node_modules/@profiscience/knockout-contrib-framework-model-builders-base/index.ts:14*



Dynamically applies mixins and returns a new constructor using the following pattern:

    class MyModel extends ConstructorBuilder.Mixin(myMixin) {}


**Type parameters:**

#### P 
#### T1 :  `object`
#### T2 :  `object`
**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| this | `T1`   |  - |
| mixin | `function`   |  Mixin to apply to constructor |





**Returns:** `T2`





___

