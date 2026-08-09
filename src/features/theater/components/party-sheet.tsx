/**
 * Party sheet — a panel that floats over the stage instead of moving it.
 *
 * The theatre only has one middle, and the stage owns it. Chat, people and the
 * room's own settings all arrive as a side sheet on a wide screen and a bottom
 * sheet on a phone, so the stage stays exactly where the eye left it.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { useTranslation } from "@/foundation/localization";

export interface PartySheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly name: string;
  onClose(): void;
}

export function PartySheet({ open, title, children, name, onClose }: PartySheetProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex justify-end" data-sf-party-sheet={name}>
      <button
        type="button"
        aria-label={t("common.action.close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className="sf-screen-enter relative flex h-full w-full max-w-sm flex-col border-l border-border/60 bg-card shadow-e3 max-sm:mt-auto max-sm:h-[72%] max-sm:max-w-none max-sm:rounded-t-2xl max-sm:border-l-0 max-sm:border-t"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.action.close")}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </aside>
    </div>
  );
}
