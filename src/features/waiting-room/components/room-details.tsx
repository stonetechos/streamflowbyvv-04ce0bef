/**
 * Room details — UX Simplification Pass.
 *
 * Everything the product used to show by default now lives behind one quiet
 * button. Nothing was deleted: sync health, playback readiness, provider
 * launch, room setup and the detailed roster are all still here, one tap away
 * for the people who need them.
 */
import type { ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/foundation/localization";

export function RoomDetails({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <Collapsible className="w-full">
      <CollapsibleTrigger className="mx-auto flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t("room.details.toggle")}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4 text-left">{children}</CollapsibleContent>
    </Collapsible>
  );
}
