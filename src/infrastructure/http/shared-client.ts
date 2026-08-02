/**
 * Shared HTTP client instance — Sprint 1.1 §7.
 *
 * One configured client for the app's own HTTP surface. Vendor SDKs (Supabase,
 * LiveKit) bring their own transports and do not route through this client.
 */
import { appConfig } from "@/config";

import { createHttpClient } from "./http-client";
import {
  createCorrelationIdInterceptor,
  createErrorLoggingInterceptor,
  createRequestLoggingInterceptor,
  createResponseLoggingInterceptor,
} from "./interceptors";
import type { HttpClient } from "./http.types";

export const httpClient: HttpClient = createHttpClient({
  baseUrl: appConfig.network.apiBaseUrl,
  defaultTimeoutMs: appConfig.network.defaultTimeoutMs,
  requestInterceptors: [createCorrelationIdInterceptor(), createRequestLoggingInterceptor()],
  responseInterceptors: [createResponseLoggingInterceptor()],
  errorInterceptors: [createErrorLoggingInterceptor()],
});
