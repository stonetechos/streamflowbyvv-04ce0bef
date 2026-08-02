/**
 * Retry policy — Sprint 1.1 §7.
 *
 * Pure functions: a policy decides IF and WHEN, never HOW to send. Only
 * idempotent methods retry by default; retrying a POST can duplicate an effect.
 */
import type { HttpMethod, RetryPolicy } from "./http.types";

export const NO_RETRY: RetryPolicy = Object.freeze({
  maxRetries: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
  jitter: false,
  retryableStatuses: [],
  retryableMethods: [],
});

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 4_000,
  jitter: true,
  // 408 request timeout, 425 too early, 429 rate limited, 5xx server-side.
  retryableStatuses: [408, 425, 429, 500, 502, 503, 504],
  retryableMethods: ["GET", "PUT", "DELETE"] as readonly HttpMethod[],
});

export function shouldRetry(
  policy: RetryPolicy,
  method: HttpMethod,
  attempt: number,
  outcome: { status?: number; isTransportError?: boolean },
): boolean {
  if (attempt >= policy.maxRetries) return false;
  if (!policy.retryableMethods.includes(method)) return false;
  if (outcome.isTransportError) return true;
  return outcome.status !== undefined && policy.retryableStatuses.includes(outcome.status);
}

/** Exponential backoff with optional full jitter, clamped to `maxDelayMs`. */
export function backoffDelayMs(policy: RetryPolicy, attempt: number): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
  return policy.jitter ? Math.round(Math.random() * exponential) : exponential;
}

/** Honours `Retry-After` (seconds or HTTP date) when the server sends one. */
export function retryAfterMs(headerValue: string | undefined): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(headerValue);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}
