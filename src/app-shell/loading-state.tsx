/**
 * Shared loading surface — Sprint 1.0 §2.
 *
 * Announced to assistive technology and motion-aware: the spinner does not
 * animate when reduced motion is in effect (MVP §12).
 */
import { useAccessibility } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  const { prefersReducedMotion } = useAccessibility();
  const text = label ?? t("common.state.loading");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-3"
    >
      <span
        aria-hidden="true"
        className={`size-6 rounded-full border-2 border-border border-t-primary ${
          prefersReducedMotion ? "" : "animate-spin"
        }`}
      />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}
