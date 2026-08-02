/**
 * Domain layer public surface — Sprint 1.6.
 * Depends only on the Repository layer beneath it (Foundation §2).
 */
export {
  bindService,
  createServiceToken,
  isServiceBound,
  resetServiceRegistry,
  resolveService,
  type ServiceToken,
} from "./service-registry";
export {
  assertDomain,
  DOMAIN_ERRORS,
  DomainError,
  domainError,
  type DomainErrorContext,
  type DomainErrorKey,
} from "./errors/domain-errors";
export * from "./events";
export * from "./services";
export * from "./shared/domain-enums";
