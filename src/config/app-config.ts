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
  });
}

export const appConfig: AppConfig = buildConfig();
