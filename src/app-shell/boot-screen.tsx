/**
 * Boot screen — the first thing StreamFlow shows.
 *
 * The double-chevron mark glides in from the right, settles for a beat, then
 * carries on to the left as the veil lifts. Presentation only: it holds no
 * app state and never blocks interaction once it has faded.
 *
 * Motion is transform/opacity only and is neutralised under reduced motion,
 * where the mark simply fades.
 */
import { useEffect, useState } from "react";

import { useAccessibility } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

/** Total time the veil stays on screen, in milliseconds. */
const BOOT_DURATION_MS = 1600;
const BOOT_DURATION_REDUCED_MS = 700;

export function BootScreen() {
  const { prefersReducedMotion } = useAccessibility();
  const { t } = useTranslation();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDone(true),
      prefersReducedMotion ? BOOT_DURATION_REDUCED_MS : BOOT_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  if (done) return null;

  return (
    <div
      className="sf-boot"
      data-reduced={prefersReducedMotion ? "true" : "false"}
      role="status"
      aria-live="polite"
      aria-label={t("common.app.name")}
    >
      <svg
        className="sf-boot-mark"
        viewBox="0 0 120 72"
        aria-hidden="true"
        focusable="false"
      >
        <polygon className="sf-boot-chevron sf-boot-chevron--back" points="8,4 56,36 8,68" />
        <polygon className="sf-boot-chevron sf-boot-chevron--front" points="60,4 112,36 60,68" />
      </svg>
    </div>
  );
}
