/**
 * Po waiting banner — Sprint 2.1.
 *
 * A lightweight strip that keeps the lobby warm while people gather. Po is a
 * visual companion in this sprint and nothing else: no planning, no tools, no
 * memory, no conversation (Po Rule). The banner therefore takes no service,
 * emits no event, and never blocks input — it is `aria-hidden` decoration with
 * a short polite caption beside it.
 *
 * `mood` and `gazeToken` are the entire contract, so a richer illustration or
 * animation engine can be dropped in later without touching callers.
 */
import { PoCompanion, type PoMood } from "./po-companion";

import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface PoWaitingBannerProps {
  /** Po smiles once everyone in the room has signalled ready. */
  readonly allReady?: boolean;
  /** Changing this makes Po glance toward the roster (e.g. a new arrival). */
  readonly gazeToken?: string | null;
  readonly className?: string;
}

export function PoWaitingBanner({
  allReady = false,
  gazeToken = null,
  className,
}: PoWaitingBannerProps) {
  const { t } = useTranslation();
  const mood: PoMood = allReady ? "delighted" : "calm";

  return (
    <aside
      className={cn(
        "flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <PoCompanion mood={mood} gazeToken={gazeToken} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{t("po.banner.title")}</p>
        <p className="text-xs text-muted-foreground">
          {t(allReady ? "po.banner.all_ready" : "po.banner.waiting")}
        </p>
      </div>
    </aside>
  );
}
