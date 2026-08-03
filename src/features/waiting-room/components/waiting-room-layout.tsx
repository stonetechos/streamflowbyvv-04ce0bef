/**
 * Waiting Room layout — Sprint 2.0.
 *
 * Presentation only: a responsive two-column shell (single column below `lg`)
 * with a labelled main region so assistive technology can jump straight to the
 * roster (MVP §12).
 */
import type { ReactNode } from "react";

import { useTranslation } from "@/foundation/localization";

export interface WaitingRoomLayoutProps {
  readonly header: ReactNode;
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
}

export function WaitingRoomLayout({ header, primary, secondary }: WaitingRoomLayoutProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("room.waiting_room.region_label")}
      className="sf-screen-enter mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:py-12 md:pb-12"
    >
      {header}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">{primary}</div>
        <aside className="space-y-6 lg:sticky lg:top-20">{secondary}</aside>
      </div>
    </section>
  );
}
