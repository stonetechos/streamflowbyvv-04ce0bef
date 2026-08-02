/**
 * Repository registry — Sprint 1.1 §3.
 *
 * Lets Domain resolve a repository CONTRACT without importing an
 * implementation, which is what keeps the dependency arrow pointing one way
 * (Foundation §2). Implementations are bound once, at the composition root.
 *
 * The registry ships EMPTY: no aggregate repository exists in Sprint 1.1.
 */
import { RepositoryError, REPOSITORY_ERRORS } from "./repository-error";

/** Nominal token carrying the contract type it resolves to. */
export interface RepositoryToken<T> {
  readonly key: symbol;
  readonly name: string;
  /** Phantom field; erased at runtime. */
  readonly __type?: T;
}

export function createRepositoryToken<T>(name: string): RepositoryToken<T> {
  return { key: Symbol(name), name };
}

type Factory<T> = () => T;

const factories = new Map<symbol, Factory<unknown>>();
const instances = new Map<symbol, unknown>();

/** Binds a contract to a lazy factory. Rebinding an existing token throws. */
export function bindRepository<T>(token: RepositoryToken<T>, factory: Factory<T>): void {
  if (factories.has(token.key)) {
    throw new Error(`Repository already bound: ${token.name}`);
  }
  factories.set(token.key, factory as Factory<unknown>);
}

/** Resolves a bound repository, memoizing the instance. */
export function resolveRepository<T>(token: RepositoryToken<T>): T {
  const cached = instances.get(token.key);
  if (cached) return cached as T;

  const factory = factories.get(token.key);
  if (!factory) {
    throw new RepositoryError(REPOSITORY_ERRORS.UNAVAILABLE, {
      aggregate: token.name,
      operation: "resolve",
    });
  }

  const instance = factory();
  instances.set(token.key, instance);
  return instance as T;
}

export function isRepositoryBound(token: RepositoryToken<unknown>): boolean {
  return factories.has(token.key);
}

/** Test-support only. */
export function resetRepositoryRegistry(): void {
  factories.clear();
  instances.clear();
}
