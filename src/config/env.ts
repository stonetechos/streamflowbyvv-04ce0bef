/**
 * Environment variable validation.
 *
 * Traceability: Sprint 1.0 §1 (Project configuration), Build Rules §5 (portability).
 *
 * Only `VITE_*` variables are read here: they are the sole browser-visible
 * configuration surface and are injected identically by any standard Vite
 * toolchain (Cursor, VS Code, Windsurf, plain `vite dev`). No platform-specific
 * variable is required for the app to boot.
 *
 * Every variable is optional with an explicit default so a fresh clone builds
 * with no `.env` file. Invalid values fail loudly at startup rather than
 * silently degrading at runtime.
 */
import { z } from "zod";

export const APP_ENVIRONMENTS = ["development", "staging", "production", "test"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const envSchema = z.object({
  VITE_APP_ENV: z.enum(APP_ENVIRONMENTS).optional(),
  VITE_APP_NAME: z.string().min(1).optional(),
  VITE_LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
  VITE_DEFAULT_LOCALE: z.string().min(2).optional(),
  VITE_ERROR_REPORTING_ENABLED: z.enum(["true", "false"]).optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

export class EnvironmentValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
  }
}

/**
 * Validates a raw environment record. Exported separately from the module-level
 * singleton so tests and non-Vite hosts can validate an arbitrary source.
 */
export function validateEnv(source: Record<string, unknown>): RawEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }
  return result.data;
}

function readSource(): Record<string, unknown> {
  // import.meta.env is present in every Vite-based host and on both the client
  // and the SSR side. It is never read outside this module.
  return (import.meta.env ?? {}) as Record<string, unknown>;
}

export const env: RawEnv = validateEnv(readSource());

/** True when the bundle was produced by a development-mode build. */
export const isDevBuild: boolean = Boolean(import.meta.env?.DEV);
