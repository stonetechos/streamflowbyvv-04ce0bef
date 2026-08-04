/**
 * Boot screen — the first thing StreamFlow shows.
 *
 * The StreamFlow mark glides in from the right, settles for a beat, then
 * carries on to the left as the veil lifts. Presentation only: it holds no
 * app state and never blocks interaction once it has faded.
 *
 * Motion is transform/opacity only and is neutralised under reduced motion,
 * where the mark simply rests in place.
 */
import { useEffect, useState } from "react";

import { useAccessibility } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

import logoUrl from "@/assets/streamflow-logo.jpg";

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
      <img
        className="sf-boot-mark"
        src={logoUrl}
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
