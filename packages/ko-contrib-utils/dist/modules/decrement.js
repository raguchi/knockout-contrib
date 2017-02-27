import ko from 'knockout';

ko.observable.fn.decrement = ko.computed.fn.decrement = function (amt) {
  return decrement(this, amt);
};

export default function decrement(obs) {
  var amt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  if (!ko.isWritableObservable(obs)) {
    throw new Error('ko.computed.fn.decrement requires a writable computed');
  }
  return obs(obs() - amt);
}