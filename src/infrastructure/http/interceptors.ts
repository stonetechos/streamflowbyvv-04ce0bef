/**
 * Standard interceptors — Sprint 1.1 §7.
 *
 * Each one does exactly one thing and is opt-in at composition time. None of
 * them attaches credentials: authentication is Sprint 1.2 and will register its
 * own interceptor without touching this file.
 */
import { logger } from "@/foundation/logging";

import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from "./http.types";

/** Stable per-request id, propagated to the server and into every log line. */
export function createCorrelationIdInterceptor(
  generateId: () => string = () => crypto.randomUUID(),
): RequestInterceptor {
  return (request) => {
    const correlationId = request.correlationId ?? generateId();
    return {
      ...request,
      correlationId,
      headers: { ...request.headers, "x-correlation-id": correlationId },
    };
  };
}

export function createRequestLoggingInterceptor(): RequestInterceptor {
  return (request) => {
    // URL and method only — query values and bodies may carry user content.
    logger.debug("http request", {
      method: request.method,
      url: request.url.split("?")[0],
      correlationId: request.correlationId,
    });
    return request;
  };
}

export function createResponseLoggingInterceptor(slowThresholdMs = 2_000): ResponseInterceptor {
  return (response) => {
    const context = {
      method: response.request.method,
      url: response.request.url.split("?")[0],
      status: response.status,
      durationMs: response.durationMs,
      correlationId: response.request.correlationId,
    };
    if (response.durationMs >= slowThresholdMs) logger.warn("http slow response", context);
    else logger.debug("http response", context);
    return response;
  };
}

export function createErrorLoggingInterceptor(): ErrorInterceptor {
  return (error, request) => {
    logger.error("http request failed", error, {
      method: request.method,
      url: request.url.split("?")[0],
      correlationId: request.correlationId,
    });
  };
}

/** Adds headers computed per request (locale, client version, and later auth). */
export function createHeaderInterceptor(
  provide: () => Record<string, string> | Promise<Record<string, string>>,
): RequestInterceptor {
  return async (request) => ({
    ...request,
    headers: { ...request.headers, ...(await provide()) },
  });
}
