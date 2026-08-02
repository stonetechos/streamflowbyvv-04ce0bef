/**
 * Server-side environment loader — Sprint 1.1 §1 (build/runtime separation).
 *
 * Filename suffix `.server.ts` keeps this module out of every client bundle.
 *
 * Values are read LAZILY, inside the accessor, never at module scope: on an
 * edge/worker runtime the environment is injected per request, so a module-scope
 * read returns `undefined` in production while appearing to work in dev.
 *
 * Nothing here is optional-with-a-default that could silently point production
 * at the wrong backend: a requested-but-missing secret throws.
 */
import { z } from "zod";

import { AppError, SYSTEM_ERRORS } from "@/shared/constants/error-taxonomy";

const serverEnvSchema = z.object({
  /** Falls back to the browser-visible URL: same project, different key. */
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  LIVEKIT_URL: z.string().min(1).optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ServerEnvKey = keyof ServerEnv;

/**
 * Reads and validates the server environment. Call inside a server-function
 * handler or a server route handler — never at module scope.
 */
export function readServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new AppError(SYSTEM_ERRORS.CONFIG_INVALID, { cause: result.error });
  }
  return result.data;
}

/** Reads one required variable, throwing a taxonomy error when it is absent. */
export function requireServerEnv(key: ServerEnvKey): string {
  const value = readServerEnv()[key];
  if (!value) {
    throw new AppError(SYSTEM_ERRORS.CONFIG_INVALID, {
      cause: new Error(`Missing required server environment variable: ${key}`),
    });
  }
  return value;
}

/** Non-throwing presence check, for capability reporting and health endpoints. */
export function hasServerEnv(...keys: readonly ServerEnvKey[]): boolean {
  const environment = readServerEnv();
  return keys.every((key) => Boolean(environment[key]));
}
