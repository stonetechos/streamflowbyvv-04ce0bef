/**
 * Domain layer public surface — Sprint 1.4.
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
