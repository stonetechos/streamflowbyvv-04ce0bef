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

/** Browser-visible connection settings. Never contains a secret. */
export interface SupabaseClientConfig {
  readonly url: string | null;
  readonly publishableKey: string | null;
  /** True only when both values are present and the client can be constructed. */
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
  readonly supabase: SupabaseClientConfig;
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

function resolveSupabase(): SupabaseClientConfig {
  const url = env.VITE_SUPABASE_URL ?? null;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? null;
  return Object.freeze({ url, publishableKey, isConfigured: Boolean(url && publishableKey) });
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
    supabase: resolveSupabase(),
    voice: resolveVoice(),
    network: resolveNetwork(),
  });
}

export const appConfig: AppConfig = buildConfig();
