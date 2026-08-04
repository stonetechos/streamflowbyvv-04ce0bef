/**
 * Typed application configuration.
 *
 * Traceability: Sprint 1.0 §1, Foundation §14 (system constants), §17 (locales).
 *
 * This is the ONLY module the rest of the application reads configuration from.
 * Nothing else may touch `import.meta.env` or `process.env`. Swapping the
 * configuration source is therefore a single-file change (Build Rules §25).
 */
import { DEFAULT_LOCALE, isSupportedLocale, type LocaleCode } from "@/shared/constants/locales";

import { env, isDevBuild, type AppEnvironment, type LogLevel } from "./env";

/**
 * Browser-visible persistence connection settings. Never contains a secret.
 *
 * Sprint 1.3 §1: named for the role, not the vendor. The environment variable
 * names remain provider-specific because the hosting platform owns them; the
 * shape the application reads does not.
 */
export interface PersistenceClientConfig {
  readonly endpointUrl: string | null;
  readonly publicKey: string | null;
  /** True only when both values are present and an adapter can be constructed. */
  readonly isConfigured: boolean;
}

export interface VoiceClientConfig {
  /** LiveKit server URL. Access tokens are never part of configuration. */
  readonly serverUrl: string | null;
  readonly isConfigured: boolean;
}

export interface NetworkConfig {
  /** Base URL for the app's own HTTP surface. Empty string = same origin. */
  readonly apiBaseUrl: string;
  readonly defaultTimeoutMs: number;
}

export interface AppConfig {
  readonly appName: string;
  /** Logical environment. Distinct from build mode: staging is a production build. */
  readonly environment: AppEnvironment;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
  /** True only for a development-mode bundle, regardless of logical environment. */
  readonly isDevBuild: boolean;
  readonly logLevel: LogLevel;
  readonly defaultLocale: LocaleCode;
  readonly errorReportingEnabled: boolean;
  readonly persistence: PersistenceClientConfig;
  readonly voice: VoiceClientConfig;
  readonly network: NetworkConfig;
}

function resolveEnvironment(): AppEnvironment {
  if (env.VITE_APP_ENV) return env.VITE_APP_ENV;
  return isDevBuild ? "development" : "production";
}

function resolveLogLevel(environment: AppEnvironment): LogLevel {
  if (env.VITE_LOG_LEVEL) return env.VITE_LOG_LEVEL;
  if (environment === "test") return "silent";
  return environment === "development" ? "debug" : "warn";
}

function resolveDefaultLocale(): LocaleCode {
  const candidate = env.VITE_DEFAULT_LOCALE;
  return candidate && isSupportedLocale(candidate) ? candidate : DEFAULT_LOCALE;
}

function resolvePersistence(): PersistenceClientConfig {
  // Lovable Cloud supplies the publishable key as either VITE_SUPABASE_ANON_KEY
  // or VITE_SUPABASE_PUBLISHABLE_KEY, depending on the project generation. Both
  // are the same Supabase anon/public key; we accept whichever is present.
  const endpointUrl = env.VITE_SUPABASE_URL ?? null;
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? null;
  return Object.freeze({
    endpointUrl,
    publicKey,
    isConfigured: Boolean(endpointUrl && publicKey),
  });
}

function resolveVoice(): VoiceClientConfig {
  const serverUrl = env.VITE_LIVEKIT_URL ?? null;
  return Object.freeze({ serverUrl, isConfigured: Boolean(serverUrl) });
}

function resolveNetwork(): NetworkConfig {
  return Object.freeze({
    apiBaseUrl: env.VITE_API_BASE_URL ?? "",
    defaultTimeoutMs: env.VITE_HTTP_TIMEOUT_MS ?? 15_000,
  });
}

function buildConfig(): AppConfig {
  const environment = resolveEnvironment();
  return Object.freeze({
    appName: env.VITE_APP_NAME ?? "StreamFlow",
    environment,
    isDevelopment: environment === "development",
    isProduction: environment === "production",
    isTest: environment === "test",
    isDevBuild,
    logLevel: resolveLogLevel(environment),
    defaultLocale: resolveDefaultLocale(),
    errorReportingEnabled:
      env.VITE_ERROR_REPORTING_ENABLED === "true" ||
      (env.VITE_ERROR_REPORTING_ENABLED === undefined && environment !== "development"),
    persistence: resolvePersistence(),
    voice: resolveVoice(),
    network: resolveNetwork(),
  });
}

export const appConfig: AppConfig = buildConfig();
