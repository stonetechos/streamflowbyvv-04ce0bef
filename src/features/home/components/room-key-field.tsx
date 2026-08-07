/**
 * Room code field — Sprint H9.
 *
 * Six characters, shown as two groups of three, in the spirit of a ticket stub
 * rather than a security challenge. The field is deliberately forgiving: it
 * accepts a paste of the whole code into any cell, ignores characters the
 * alphabet does not contain, auto-advances as you type, and steps backwards on
 * backspace from an empty cell.
 *
 * Presentation only. It validates nothing beyond shape; the room's existence
 * and this person's admission are decided far below this component.
 */
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

import { ROOM_KEY_GROUP, ROOM_KEY_LENGTH, normalizeRoomKeyInput } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export type RoomKeyFieldTone = "neutral" | "valid" | "invalid" | "busy";

export interface RoomKeyFieldProps {
  readonly value: string;
  readonly tone?: RoomKeyFieldTone;
  readonly disabled?: boolean;
  /** Announced with the group; each cell also carries its own position label. */
  readonly label: string;
  readonly describedBy?: string;
  readonly size?: "md" | "lg";
  onChange(next: string): void;
  onPasted?(): void;
  onComplete?(): void;
}

export function RoomKeyField({
  value,
  tone = "neutral",
  disabled = false,
  label,
  describedBy,
  size = "md",
  onChange,
  onPasted,
  onComplete,
}: RoomKeyFieldProps) {
  const { t } = useTranslation();
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const characters = Array.from({ length: ROOM_KEY_LENGTH }, (_, index) => value[index] ?? "");
  const completed = useRef(false);

  useEffect(() => {
    if (value.length === ROOM_KEY_LENGTH && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
    if (value.length < ROOM_KEY_LENGTH) completed.current = false;
  }, [value, onComplete]);

  function focusCell(index: number) {
    const target = cells.current[Math.max(0, Math.min(index, ROOM_KEY_LENGTH - 1))];
    target?.focus();
    target?.select();
  }

  function writeAt(index: number, raw: string) {
    const typed = normalizeRoomKeyInput(raw);
    if (typed.length === 0) {
      // A rejected character must not silently vanish the cell's content.
      onChange(value);
      return;
    }
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(
      0,
      ROOM_KEY_LENGTH,
    );
    onChange(next);
    focusCell(index + typed.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (characters[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
        focusCell(index);
        return;
      }
      onChange(value.slice(0, Math.max(0, index - 1)) + value.slice(index));
      focusCell(index - 1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    const cleaned = normalizeRoomKeyInput(text);
    if (cleaned.length === 0) return;
    onChange((value.slice(0, index) + cleaned).slice(0, ROOM_KEY_LENGTH));
    focusCell(index + cleaned.length);
    onPasted?.();
  }

  const cellSize =
    size === "lg" ? "h-16 w-12 text-2xl sm:h-20 sm:w-14 sm:text-3xl" : "h-12 w-10 text-lg";

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      data-sf-room-key-tone={tone}
      className="flex items-center gap-1.5 sm:gap-2"
    >
      {characters.map((character, index) => (
        <div key={index} className="flex items-center gap-1.5 sm:gap-2">
          {index === ROOM_KEY_GROUP ? (
            <span aria-hidden="true" className="select-none px-0.5 text-muted-foreground">
              –
            </span>
          ) : null}
          <input
            ref={(node) => {
              cells.current[index] = node;
            }}
            value={character}
            disabled={disabled}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={2}
            aria-label={t("room.key.field.cell", {
              position: index + 1,
              total: ROOM_KEY_LENGTH,
            })}
            aria-invalid={tone === "invalid"}
            data-sf-room-key-cell={index}
            onChange={(event) => writeAt(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPaste={(event) => onPaste(event, index)}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(
              "rounded-xl border-2 bg-background text-center font-display font-semibold uppercase tracking-widest",
              "transition-[border-color,transform,box-shadow] duration-normal ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "motion-reduce:transition-none",
              cellSize,
              character ? "border-primary shadow-e1" : "border-border",
              tone === "invalid" && "border-destructive text-destructive",
              tone === "valid" && "border-success",
              tone === "busy" && "opacity-70",
              disabled && "cursor-not-allowed opacity-60",
            )}
          />
        </div>
      ))}
    </div>
  );
}
