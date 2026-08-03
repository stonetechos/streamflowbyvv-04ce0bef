/**
 * HTTP contracts — Sprint 1.1 §7.
 *
 * Transport-agnostic by design: the shape below is satisfiable by `fetch`, by a
 * test double, or by a native bridge under Capacitor, so no caller ever imports
 * a transport directly (Foundation §2: Infrastructure is the only vendor-aware
 * layer, and even it hides the vendor behind an interface).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  readonly method: HttpMethod;
  /** Absolute URL, or a path resolved against the configured base URL. */
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  /** Already-serializable value; the client performs JSON encoding. */
  readonly body?: unknown;
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
  /** Caller-supplied cancellation, composed with the timeout signal. */
  readonly signal?: AbortSignal;
  /** Propagated as `x-correlation-id` and attached to every log line. */
  readonly correlationId?: string;
}

export interface HttpResponse<TBody = unknown> {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: TBody;
  readonly request: HttpRequest;
  readonly durationMs: number;
}

export interface RetryPolicy {
  /** Retries AFTER the initial attempt. `0` disables retrying. */
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /** Randomized delay spread; prevents synchronized client stampedes. */
  readonly jitter: boolean;
  readonly retryableStatuses: readonly number[];
  readonly retryableMethods: readonly HttpMethod[];
}

/** Runs before dispatch. Returning a new request replaces the outgoing one. */
export type RequestInterceptor = (request: HttpRequest) => Promise<HttpRequest> | HttpRequest;

/** Runs after a response is received, successful or not. */
export type ResponseInterceptor = (response: HttpResponse) => Promise<HttpResponse> | HttpResponse;

/** Runs when a request fails to produce a response (network, timeout, abort). */
export type ErrorInterceptor = (error: unknown, request: HttpRequest) => Promise<void> | void;

export interface HttpClient {
  request<TBody = unknown>(
    request: Omit<HttpRequest, "headers"> & { headers?: Readonly<Record<string, string>> },
  ): Promise<HttpResponse<TBody>>;
  get<TBody = unknown>(url: string, init?: HttpRequestInit): Promise<HttpResponse<TBody>>;
  post<TBody = unknown>(
    url: string,
    body?: unknown,
    init?: HttpRequestInit,
  ): Promise<HttpResponse<TBody>>;
  put<TBody = unknown>(
    url: string,
    body?: unknown,
    init?: HttpRequestInit,
  ): Promise<HttpResponse<TBody>>;
  patch<TBody = unknown>(
    url: string,
    body?: unknown,
    init?: HttpRequestInit,
  ): Promise<HttpResponse<TBody>>;
  delete<TBody = unknown>(url: string, init?: HttpRequestInit): Promise<HttpResponse<TBody>>;
  /** Returns a client with the interceptor appended; the original is untouched. */
  withRequestInterceptor(interceptor: RequestInterceptor): HttpClient;
  withResponseInterceptor(interceptor: ResponseInterceptor): HttpClient;
  withErrorInterceptor(interceptor: ErrorInterceptor): HttpClient;
}

export type HttpRequestInit = Partial<
  Pick<HttpRequest, "headers" | "query" | "timeoutMs" | "retry" | "signal" | "correlationId">
>;

export interface HttpClientOptions {
  readonly baseUrl?: string;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
  readonly defaultTimeoutMs?: number;
  readonly retry?: RetryPolicy;
  readonly requestInterceptors?: readonly RequestInterceptor[];
  readonly responseInterceptors?: readonly ResponseInterceptor[];
  readonly errorInterceptors?: readonly ErrorInterceptor[];
  /** Injectable transport. Defaults to global `fetch`; overridden in tests. */
  readonly fetchImpl?: typeof fetch;
}
