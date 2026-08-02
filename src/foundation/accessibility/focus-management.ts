/**
 * Focus management utilities — Sprint 1.0 §7 (keyboard navigation foundation).
 * DOM-only helpers; no product behaviour.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

export function focusFirstElement(container: HTMLElement): boolean {
  const [first] = getFocusableElements(container);
  first?.focus();
  return Boolean(first);
}

/**
 * Traps Tab/Shift+Tab inside `container`. Returns a cleanup function.
 * Escape handling is intentionally left to the caller: dismiss semantics differ
 * per surface and are not a foundation decision.
 */
export function trapFocus(container: HTMLElement): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", onKeyDown);
  return () => container.removeEventListener("keydown", onKeyDown);
}

/** Restores focus to the previously focused element (dialog close, route exit). */
export function captureFocusOrigin(): () => void {
  const origin = document.activeElement as HTMLElement | null;
  return () => origin?.focus?.();
}
