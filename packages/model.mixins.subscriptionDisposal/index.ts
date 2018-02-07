import * as ko from 'knockout'
import { ConstructorBuilder } from '@profiscience/knockout-contrib-model-builders-base'

export const SUBSCRIPTIONS = Symbol('SUBSCRIPTIONS')

type TwoDimensionalMap<X, Y, V> = Map<X, Map<Y, V>>

type SubscriptionsMap = TwoDimensionalMap<any, any, KnockoutSubscription>

/**
 * Adds .subscribe(obs, fn) and .dispose() methods with subscription tracking to prevent leaks
 *
 * Used by constructor builders
 *
 * @param ctor BaseModel
 */
export function SubscriptionDisposalMixin<T extends { new(...args: any[]): ConstructorBuilder }>(ctor: T) {
  return class Subscribable extends ctor {
    private [SUBSCRIPTIONS] = new Map<any, Map<any, KnockoutSubscription>>()

    /**
     * Create a subscription that will be disposed with the model
     *
     * Provides sugar for passing an accessor function or tree
     *
     * Example:
     *
     * ```typescript
     *  this.subscribe(obs, onChange)
     *  this.subscribe(() => obs(), onChange)
     *  this.subscribe({ obs }, onChange)
     * ```
     */
    public subscribe<T2>(obs: KnockoutObservable<T2>, fn: (newVal: T2) => void): KnockoutSubscription
    public subscribe<T2>(accessor: () => T2, fn: (newVal: T2) => void): KnockoutSubscription
    public subscribe(tree: any, fn: (newVal: any) => void): KnockoutSubscription
    public subscribe<T2>(arg: any, fn: any) {
      let obs: KnockoutObservable<any>

      if (ko.isObservable(arg)) {
        obs = arg
      } else if (typeof arg === 'function') {
        obs = ko.pureComputed(arg)
      } else {
        obs = ko.pureComputed(() => ko.toJS(arg))
      }
      const sub = (obs as KnockoutObservable<T2>).subscribe((newVal: T2) => { fn(newVal) })

      this.addSubscription(arg, fn, sub)

      return sub
    }

    /**
     * Disposes a single subscription
     */
    public unsubscribe<T2>(obs: KnockoutObservable<T2>, fn: (newVal: T2) => void): void
    public unsubscribe<T2>(accessor: () => T2, fn: (newVal: T2) => void): void
    public unsubscribe(tree: any, fn: (newVal: any) => void): void
    public unsubscribe(sub: KnockoutSubscription): void
    public unsubscribe<T2>(arg: any, fn?: any) {
      if (typeof arg.dispose === 'function') arg.dispose()
      else this.removeSubscription(arg, fn)
    }

    /**
     * Dispose all subscriptions
     */
    public dispose(): void {
      this.removeAllSubscriptions()
      super.dispose()
    }

    private addSubscription(arg: any, fn: any, sub: KnockoutSubscription) {
      if (!this[SUBSCRIPTIONS].has(arg)) this[SUBSCRIPTIONS].set(arg, new Map());
      (this[SUBSCRIPTIONS].get(arg) as Map<any, KnockoutSubscription>).set(fn, sub)
    }

    private removeSubscription(arg: any, fn: any) {
      (this[SUBSCRIPTIONS].get(arg) as Map<any, any>).get(fn).dispose();
      (this[SUBSCRIPTIONS].get(arg) as Map<any, any>).delete(fn)
    }

    private removeAllSubscriptions() {
      this[SUBSCRIPTIONS].forEach((v) => v.forEach((s) => s.dispose()))
    }
  }
}
