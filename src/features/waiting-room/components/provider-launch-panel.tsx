/**
 * Provider launch panel — Sprint 2.8.
 *
 * Pure presentation over `ProviderLaunchModel`. It renders the plan the Domain
 * coordinator produced and nothing more: it never builds a URL, never picks a
 * target, and never decides whether launching is allowed. Every string is a
 * translation key supplied by Domain guidance.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { guidanceHeadingKey, type LaunchTarget } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import type { ProviderLaunchModel } from "../use-provider-launch";

const STATUS_TONE: Record<string, string> = {
  not_launched: "text-muted-foreground",
  launching: "text-muted-foreground",
  launched: "text-primary",
  failed: "text-destructive",
};

export function ProviderLaunchPanel({ model }: { model: ProviderLaunchModel }) {
  const { t } = useTranslation();
  const { plan } = model;

  if (!plan) return null;

  const targets: readonly LaunchTarget[] = plan.primaryTarget
    ? [plan.primaryTarget, ...plan.fallbackTargets]
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{t(guidanceHeadingKey(plan.launchClass))}</CardTitle>
        <Badge variant={plan.launchClass === "unsupported" ? "outline" : "secondary"}>
          {t(`provider.launch.class.${plan.launchClass}`)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {plan.refusalReason ? (
          <p className="text-sm text-muted-foreground">
            {t(`provider.launch.refusal.${plan.refusalReason}`)}
          </p>
        ) : null}

        {targets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targets.map((target, index) => (
              <Button
                key={target.url}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                disabled={!plan.canLaunch || model.status === "launching"}
                onClick={() => model.launch(target)}
              >
                {t(target.labelKey)}
              </Button>
            ))}
            {plan.storeTarget ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => model.launch(plan.storeTarget as LaunchTarget)}
              >
                {t(plan.storeTarget.labelKey)}
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className={`text-sm ${STATUS_TONE[model.status] ?? "text-muted-foreground"}`}>
          {t(`provider.launch.status.${model.status}`)}
        </p>

        {/* Manual-play honesty: StreamFlow coordinates people, not players. */}
        {plan.requiresManualPlay ? (
          <ol className="space-y-1 text-sm text-muted-foreground">
            {plan.guidanceKeys.map((key, index) => (
              <li key={key}>
                <span className="mr-2 tabular-nums">{index + 1}.</span>
                {t(key)}
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}
