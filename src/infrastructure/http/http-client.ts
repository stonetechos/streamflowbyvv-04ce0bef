/**
 * Fetch-based HTTP client — Sprint 1.1 §7.
 *
 * Responsibilities: URL resolution, JSON encode/decode, timeout, cancellation,
 * retry with backoff, and the interceptor pipeline. It carries no knowledge of
 * any specific API; callers compose behaviour through interceptors.
 */
import { logger } from "@/foundation/logging";

import {
  HttpError,
  NETWORK_ERRORS,
  descriptorForStatus,
  type HttpErrorContext,
} from "./http-error";
import {
  DEFAULT_RETRY_POLICY,
  backoffDelayMs,
  retryAfterMs,
  shouldRetry,
} from "./retry-policy";
import type {
  ErrorInterceptor,
  HttpClient,
  HttpClientOptions,
  HttpMethod,
  HttpRequest,
  HttpRequestInit,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from "./http.types";

const JSON_CONTENT_TYPE = "application/json";

function resolveUrl(baseUrl: string | undefined, url: string): string {
  if (!baseUrl || /^https?:\/\//i.test(url)) return url;
  return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

function applyQuery(url: string, query: HttpRequest["query"]): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.append(key, String(value));
  }
  const search = params.toString();
  if (!search) return url;
  return url.includes("?") ? `${url}&${search}` : `${url}?${search}`;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes(JSON_CONTENT_TYPE)) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch (cause) {
      throw new HttpError(
        NETWORK_ERRORS.BAD_RESPONSE,
        { url: response.url, method: "GET", status: response.status },
        { cause },
      );
    }
  }
  return response.text();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const requestInterceptors = [...(options.requestInterceptors ?? [])];
  const responseInterceptors = [...(options.responseInterceptors ?? [])];
  const errorInterceptors = [...(options.errorInterceptors ?? [])];
  const retryPolicy = options.retry ?? DEFAULT_RETRY_POLICY;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function dispatch<TBody>(initial: HttpRequest): Promise<HttpResponse<TBody>> {
    let request = initial;
    for (const interceptor of requestInterceptors) {
      request = await interceptor(request);
    }

    const url = applyQuery(resolveUrl(options.baseUrl, request.url), request.query);
    const timeoutMs = request.timeoutMs ?? options.defaultTimeoutMs ?? 15_000;
    const policy = request.retry ?? retryPolicy;
    const errorContext: HttpErrorContext = {
      url,
      method: request.method,
      ...(request.correlationId ? { correlationId: request.correlationId } : {}),
    };

    for (let attempt = 0; ; attempt++) {
      const startedAt = Date.now();
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
      let timedOut = false;
      timeoutController.signal.addEventListener("abort", () => {
        timedOut = true;
      });

      const signals = [timeoutController.signal];
      if (request.signal) signals.push(request.signal);

      try {
        const response = await fetchImpl(url, {
          method: request.method,
          headers: request.headers,
          signal: AbortSignal.any(signals),
          ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
        });

        if (
          !response.ok &&
          shouldRetry(policy, request.method, attempt, { status: response.status })
        ) {
          const wait =
            retryAfterMs(response.headers.get("retry-after") ?? undefined) ??
            backoffDelayMs(policy, attempt);
          clearTimeout(timer);
          await delay(wait);
          continue;
        }

        const parsed = await parseBody(response);
        let result: HttpResponse = {
          status: response.status,
          ok: response.ok,
          headers: headersToRecord(response.headers),
          body: parsed,
          request,
          durationMs: Date.now() - startedAt,
        };
        for (const interceptor of responseInterceptors) {
          result = await interceptor(result);
        }

        if (!result.ok) {
          throw new HttpError(descriptorForStatus(result.status), {
            ...errorContext,
            status: result.status,
            responseBody: result.body,
          });
        }
        return result as HttpResponse<TBody>;
      } catch (error) {
        clearTimeout(timer);

        if (error instanceof HttpError) {
          for (const interceptor of errorInterceptors) await interceptor(error, request);
          throw error;
        }

        // A caller-initiated abort is a deliberate cancellation, not a failure.
        if (isAbortError(error) && !timedOut) {
          throw new HttpError(NETWORK_ERRORS.CANCELLED, errorContext, { cause: error });
        }

        const transportDescriptor = timedOut
          ? NETWORK_ERRORS.TIMEOUT
          : typeof navigator !== "undefined" && navigator.onLine === false
            ? NETWORK_ERRORS.OFFLINE
            : NETWORK_ERRORS.UNREACHABLE;

        if (shouldRetry(policy, request.method, attempt, { isTransportError: true })) {
          await delay(backoffDelayMs(policy, attempt));
          continue;
        }

        const httpError = new HttpError(transportDescriptor, errorContext, { cause: error });
        for (const interceptor of errorInterceptors) await interceptor(httpError, request);
        throw httpError;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  function buildRequest(
    method: HttpMethod,
    url: string,
    body: unknown,
    init: HttpRequestInit = {},
  ): HttpRequest {
    const { headers, ...rest } = init;
    return {
      method,
      url,
      headers: {
        accept: JSON_CONTENT_TYPE,
        ...(body === undefined ? {} : { "content-type": JSON_CONTENT_TYPE }),
        ...options.defaultHeaders,
        ...headers,
      },
      ...(body === undefined ? {} : { body }),
      ...rest,
    };
  }

  const derive = (patch: Partial<HttpClientOptions>): HttpClient =>
    createHttpClient({
      ...options,
      requestInterceptors,
      responseInterceptors,
      errorInterceptors,
      ...patch,
    });

  return {
    request: (input) => dispatch({ headers: {}, ...input }),
    get: (url, init) => dispatch(buildRequest("GET", url, undefined, init)),
    post: (url, body, init) => dispatch(buildRequest("POST", url, body, init)),
    put: (url, body, init) => dispatch(buildRequest("PUT", url, body, init)),
    patch: (url, body, init) => dispatch(buildRequest("PATCH", url, body, init)),
    delete: (url, init) => dispatch(buildRequest("DELETE", url, undefined, init)),
    withRequestInterceptor: (interceptor: RequestInterceptor) =>
      derive({ requestInterceptors: [...requestInterceptors, interceptor] }),
    withResponseInterceptor: (interceptor: ResponseInterceptor) =>
      derive({ responseInterceptors: [...responseInterceptors, interceptor] }),
    withErrorInterceptor: (interceptor: ErrorInterceptor) =>
      derive({ errorInterceptors: [...errorInterceptors, interceptor] }),
  };
}

export const httpLogger = logger.child({ module: "http" });
