/**
 * Test-side instrumentation — WP1 (T4).
 *
 * WP1 is test-only. Every measurement here is taken from what a browser or a
 * Data-API client can already observe; nothing instruments production code.
 * Where a measurement is not observable from outside, the helper reports that
 * fact so the spec can record `unmeasured` instead of guessing.
 *
 * Traceability: WP1 task T4 in `docs/m1/M1-Backlog.md`; unknown U-02 in
 * `docs/m1/M1.1-Certification-Harness-Discovery.md` §7.
 */
import type { Page } from "@playwright/test";

export interface ConvergenceSample<T> {
  readonly label: string;
  /** Wall-clock ms at which the observer first satisfied the predicate. */
  readonly observedAt: number | null;
  readonly value: T | null;
}

export interface ConvergenceResult<T> {
  readonly samples: readonly ConvergenceSample<T>[];
  /** Milliseconds between the first and last observer to converge. */
  readonly spreadMs: number | null;
  readonly converged: boolean;
}

export interface Observer<T> {
  readonly label: string;
  read(): Promise<T>;
}

/**
 * Polls every observer until each satisfies `predicate`, and reports the
 * spread between the earliest and latest observation. Any observer that never
 * converges leaves `spreadMs` null — a partial convergence is not a spread.
 */
export async function measureConvergence<T>(
  observers: readonly Observer<T>[],
  predicate: (value: T) => boolean,
  options: { readonly timeoutMs?: number; readonly pollMs?: number } = {},
): Promise<ConvergenceResult<T>> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const pollMs = options.pollMs ?? 100;
  const deadline = Date.now() + timeoutMs;
  const samples = new Map<string, ConvergenceSample<T>>(
    observers.map((observer) => [
      observer.label,
      { label: observer.label, observedAt: null, value: null },
    ]),
  );

  while (Date.now() < deadline) {
    await Promise.all(
      observers.map(async (observer) => {
        if (samples.get(observer.label)!.observedAt !== null) return;
        let value: T;
        try {
          value = await observer.read();
        } catch {
          return;
        }
        if (predicate(value)) {
          samples.set(observer.label, {
            label: observer.label,
            observedAt: Date.now(),
            value,
          });
        }
      }),
    );
    if ([...samples.values()].every((sample) => sample.observedAt !== null)) break;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  const ordered = [...samples.values()];
  const converged = ordered.every((sample) => sample.observedAt !== null);
  const times = ordered.map((sample) => sample.observedAt).filter((t): t is number => t !== null);
  return {
    samples: ordered,
    spreadMs: converged && times.length > 0 ? Math.max(...times) - Math.min(...times) : null,
    converged,
  };
}

/**
 * Time from an event to the first moment a page shows `pattern`. Returns null
 * when the page never shows it inside the window — an unobserved transition is
 * unmeasured, not a failure of the clock.
 */
export async function measureVisibleTransition(
  page: Page,
  since: number,
  pattern: RegExp,
  timeoutMs = 20_000,
): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText).catch(() => "");
    if (pattern.test(text)) return Date.now() - since;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

/**
 * Reports whether the page exposes any machine-readable countdown-zero
 * timestamp. WP1 may not add production instrumentation, so this returns the
 * discovery answer to U-02 rather than fabricating a measurement.
 */
export async function countdownTimestampProbe(page: Page): Promise<{
  readonly observable: boolean;
  readonly detail: string;
}> {
  const found = await page
    .evaluate(() => {
      const attributes = ["data-countdown-zero-at", "data-countdown-state", "data-countdown"];
      for (const attribute of attributes) {
        if (document.querySelector(`[${attribute}]`)) return attribute;
      }
      const globalHook = (window as unknown as Record<string, unknown>)["__streamflowCountdown"];
      return globalHook ? "__streamflowCountdown" : null;
    })
    .catch(() => null);
  return found
    ? { observable: true, detail: `Countdown zero observable via ${found}.` }
    : {
        observable: false,
        detail:
          "No countdown-zero timestamp is exposed to the DOM or to a window hook. Per-client zero timestamps are not observable without production instrumentation (U-02); WP1 is test-only and may not add it.",
      };
}

/**
 * Elements still carrying perceptible motion.
 *
 * The threshold matters: the reduced-motion rule in src/styles.css collapses
 * durations to 0.01ms rather than removing them, which is the accepted way to
 * honour the preference without breaking transition-end handlers. A duration
 * under 50 ms is imperceptible and is not motion; anything longer is.
 */
const PERCEPTIBLE_MOTION_MS = 50;

export async function movingElements(page: Page): Promise<readonly string[]> {
  return page.evaluate((thresholdMs: number) => {
    const longest = (value: string): number =>
      Math.max(
        0,
        ...value.split(",").map((part) => {
          const trimmed = part.trim();
          if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed);
          if (trimmed.endsWith("s")) return Number.parseFloat(trimmed) * 1000;
          return 0;
        }),
      );

    const moving: string[] = [];
    for (const node of Array.from(document.querySelectorAll("*")).slice(0, 4000)) {
      const style = getComputedStyle(node);
      const animated =
        style.animationName !== "none" &&
        style.animationPlayState === "running" &&
        longest(style.animationDuration) >= thresholdMs;
      const transitioned =
        style.transitionProperty !== "none" && longest(style.transitionDuration) >= thresholdMs;
      if (animated || transitioned) {
        moving.push(
          `${node.tagName.toLowerCase()}${node.className && typeof node.className === "string" ? `.${node.className.split(/\s+/)[0]}` : ""}:${style.animationName}/${style.animationDuration}/${style.transitionDuration}`,
        );
      }
    }
    return moving.slice(0, 12);
  }, PERCEPTIBLE_MOTION_MS);
}

export interface DocumentSemantics {
  readonly lang: string;
  readonly title: string;
}

/** WCAG 3.1.1 (Language of Page) and 2.4.2 (Page Titled) — both automatable. */
export async function documentSemantics(page: Page): Promise<DocumentSemantics> {
  return page.evaluate(() => ({
    lang: document.documentElement.getAttribute("lang") ?? "",
    title: document.title,
  }));
}

/** Interactive controls with no accessible name — the automated WCAG subset. */
export async function unnamedControls(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"));
    return nodes
      .filter((node) => {
        const el = node as HTMLElement;
        if (el.offsetParent === null && el.getAttribute("aria-hidden") === "true") return false;
        const labelledBy = el.getAttribute("aria-labelledby");
        const labelledByText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? "")
              .join(" ")
          : "";
        const associatedLabel = el.id
          ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent ?? "")
          : "";
        const wrappingLabel = el.closest("label")?.textContent ?? "";
        const name = [
          el.getAttribute("aria-label"),
          labelledByText,
          associatedLabel,
          wrappingLabel,
          el.getAttribute("title"),
          (el as HTMLInputElement).placeholder,
          el.textContent,
        ]
          .filter(Boolean)
          .join(" ");
        return name.trim().length === 0;
      })
      .map((node) => (node as HTMLElement).outerHTML.slice(0, 120));
  });
}
