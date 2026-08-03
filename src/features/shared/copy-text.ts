/**
 * Clipboard helper — RC2 Safari compatibility.
 *
 * Safari only exposes `navigator.clipboard` in secure contexts, and refuses
 * async writes that are not attached to the originating user gesture. Every
 * copy affordance in the product therefore goes through this one helper: it
 * tries the modern API first and falls back to a selection copy, so an invite
 * link is never silently un-copyable on an iPhone.
 *
 * Presentation-adjacent utility: no service, no state, no policy.
 */
export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the selection copy below.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "true");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "0";
    field.style.opacity = "0";
    document.body.appendChild(field);

    // iOS Safari ignores `select()` on a readonly field unless the range is
    // set explicitly.
    field.contentEditable = "true";
    const range = document.createRange();
    range.selectNodeContents(field);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    field.setSelectionRange(0, value.length);

    const copied = document.execCommand("copy");
    selection?.removeAllRanges();
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}
