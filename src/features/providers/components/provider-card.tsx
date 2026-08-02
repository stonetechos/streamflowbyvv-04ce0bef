/**
 * Provider card — Sprint 2.2.
 *
 * One provider, labelled honestly: Supported, Manual sync, Unverified, or
 * Unavailable, with every restriction spelled out rather than hidden behind a
 * disabled control (MVP Spec §7, §11). Selecting is a radio choice, so a
 * keyboard user moves through the list with arrow keys.
 */
import { Check, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import {
  selectionClassHintKey,
  selectionClassLabelKey,
  type ProviderOptionView,
} from "../provider.view-model";

export interface ProviderCardProps {
  readonly option: ProviderOptionView;
  readonly isSelected: boolean;
  readonly isPending: boolean;
  readonly canFavorite: boolean;
  onSelect(providerId: string): void;
  onToggleFavorite(providerId: string, favorite: boolean): void;
}

const BADGE_VARIANT: Record<ProviderOptionView["selectionClass"], "default" | "secondary" | "outline" | "destructive"> = {
  supported: "default",
  manual_sync: "secondary",
  unverified: "outline",
  unavailable: "destructive",
};

export function ProviderCard({
  option,
  isSelected,
  isPending,
  canFavorite,
  onSelect,
  onToggleFavorite,
}: ProviderCardProps) {
  const { t } = useTranslation();
  const name = t(option.nameKey);
  const disabled = !option.isSelectable || isPending;

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
        disabled && "opacity-70",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-describedby={`provider-hint-${option.id}`}
        disabled={disabled}
        onClick={() => onSelect(option.id)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-medium">{name}</span>
          <Badge variant={BADGE_VARIANT[option.selectionClass]}>
            {t(selectionClassLabelKey(option.selectionClass))}
          </Badge>
          {option.isDefault ? (
            <Badge variant="outline">{t("provider.badge.default")}</Badge>
          ) : null}
          {isSelected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}
        </span>
        <span
          id={`provider-hint-${option.id}`}
          className="mt-1 block text-sm text-muted-foreground"
        >
          {t(selectionClassHintKey(option.selectionClass))}
        </span>
      </button>

      {option.rationaleKeys.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {option.rationaleKeys.map((key) => (
            <li key={key}>• {t(key)}</li>
          ))}
        </ul>
      ) : null}

      {canFavorite ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          aria-pressed={option.isFavorite}
          aria-label={t(option.isFavorite ? "provider.action.unfavorite" : "provider.action.favorite", {
            provider: name,
          })}
          onClick={() => onToggleFavorite(option.id, !option.isFavorite)}
        >
          <Star
            aria-hidden="true"
            className={cn("size-4", option.isFavorite && "fill-current text-primary")}
          />
        </Button>
      ) : null}
    </div>
  );
}
