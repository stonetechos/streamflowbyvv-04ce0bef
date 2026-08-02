/**
 * Domain service registry — Sprint 1.4 §12.
 *
 * Dependency injection for Domain services, mirroring the repository registry
 * (Sprint 1.1 §3). Feature and Presentation resolve a CONTRACT; only the
 * composition root decides which implementation answers, which is what keeps
 * the dependency arrow pointing one way (Foundation §2).
 */

export interface ServiceToken<T> {
  readonly key: symbol;
  readonly name: string;
  /** Phantom field; erased at runtime. */
  readonly __type?: T;
}

export function createServiceToken<T>(name: string): ServiceToken<T> {
  return { key: Symbol(name), name };
}

type Factory<T> = () => T;

const factories = new Map<symbol, Factory<unknown>>();
const instances = new Map<symbol, unknown>();

/** Binds a contract to a lazy factory. Rebinding an existing token throws. */
export function bindService<T>(token: ServiceToken<T>, factory: Factory<T>): void {
  if (factories.has(token.key)) {
    throw new Error(`Service already bound: ${token.name}`);
  }
  factories.set(token.key, factory as Factory<unknown>);
}

export function isServiceBound(token: ServiceToken<unknown>): boolean {
  return factories.has(token.key);
}

/** Resolves a bound service, memoizing the instance. */
export function resolveService<T>(token: ServiceToken<T>): T {
  const cached = instances.get(token.key);
  if (cached) return cached as T;

  const factory = factories.get(token.key);
  if (!factory) {
    throw new Error(`Service not bound: ${token.name}`);
  }

  const instance = factory();
  instances.set(token.key, instance);
  return instance as T;
}

/** Test-support only. */
export function resetServiceRegistry(): void {
  factories.clear();
  instances.clear();
}
