/**
 * Product analytics hook — Sprint H6.
 *
 * Emits privacy-safe product events and keeps a session-only development
 * metrics view. Nothing is persisted, and nothing here is certification
 * evidence.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import {
  createDevMetricsRecorder,
  productEvent,
  type DevMetricsSnapshot,
  type ProductEventName,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "product-analytics";

export interface ProductAnalyticsModel {
  track(name: ProductEventName, props?: Readonly<Record<string, unknown>>): void;
  readonly metrics: DevMetricsSnapshot;
}

export function useProductAnalytics(): ProductAnalyticsModel {
  const recorder = useMemo(() => createDevMetricsRecorder(), []);
  const [metrics, setMetrics] = useState<DevMetricsSnapshot>(() => recorder.snapshot());
  const seen = useRef(new Set<string>());

  const track = useCallback(
    (name: ProductEventName, props: Readonly<Record<string, unknown>> = {}) => {
      const event = productEvent(name, props);
      recorder.record(event);
      setMetrics(recorder.snapshot());
      // One log line per distinct event shape keeps the console readable.
      const key = `${name}:${Object.keys(event.props).sort().join(",")}`;
      if (!seen.current.has(key)) seen.current.add(key);
      logger.debug("product_event", { module: MODULE, event: name, ...event.props });
    },
    [recorder],
  );

  return { track, metrics };
}
