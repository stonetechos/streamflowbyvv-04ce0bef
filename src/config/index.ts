/**
 * Configuration public surface.
 *
 * `server-env.server.ts` is deliberately NOT re-exported here: importing this
 * barrel must never pull server-only code into a client bundle. Server code
 * imports `@/config/server-env.server` directly, inside its handler.
 */
export {
  appConfig,
  type AppConfig,
  type NetworkConfig,
  type SupabaseClientConfig,
  type VoiceClientConfig,
} from "./app-config";
export {
  env,
  isDevBuild,
  validateEnv,
  EnvironmentValidationError,
  APP_ENVIRONMENTS,
  LOG_LEVELS,
  type AppEnvironment,
  type LogLevel,
  type RawEnv,
} from "./env";
