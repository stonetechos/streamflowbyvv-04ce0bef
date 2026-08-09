/**
 * Picture-in-Picture layer — Sprint H12.
 *
 * Two real mechanisms, one honest fallback:
 *   1. Document Picture-in-Picture (`window.documentPictureInPicture`) opens an
 *      always-on-top window we can fill with our own HTML, so the floating
 *      window carries the same working controls as the theatre box.
 *   2. Element Picture-in-Picture (`video.requestPictureInPicture()`) when the
 *      browser has no document PiP. Controls stay browser-native there.
 *   3. Neither: the control reports itself unsupported and explains why.
 *
 * There is never a second video. The single media element is moved, so no
 * synchronisation is invented and no playback restarts.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type PipSupport = "document" | "element" | "none";
export type PipMode = "document" | "element";

interface DocumentPipApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  readonly window: Window | null;
}

function documentPip(): DocumentPipApi | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { documentPictureInPicture?: DocumentPipApi }).documentPictureInPicture ??
    null
  );
}

/**
 * Test seam. Production code never calls this: only the verification harness
 * and unit tests do, so real feature detection is untouched in a shipped build.
 * Passing null returns the browser's own answer.
 */
let supportOverride: PipSupport | null = null;

export function __setPipSupportOverride(value: PipSupport | null): void {
  supportOverride = value;
}

export function __pipSupportOverride(): PipSupport | null {
  return supportOverride;
}

export function detectPipSupport(): PipSupport {
  if (supportOverride !== null) return supportOverride;
  if (typeof window === "undefined" || typeof document === "undefined") return "none";
  if (documentPip()) return "document";
  const canElementPip =
    "pictureInPictureEnabled" in document &&
    (document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled === true;
  return canElementPip ? "element" : "none";
}

export interface UsePictureInPictureInput {
  readonly getVideo: () => HTMLVideoElement | null;
  /** Called with the PiP document body once a document PiP window is open. */
  onEnter?(mode: PipMode): void;
  /** Called after the window/overlay closed, before focus is restored. */
  onExit?(mode: PipMode): void;
}

export interface PictureInPictureHandle {
  readonly support: PipSupport;
  readonly isSupported: boolean;
  readonly isActive: boolean;
  readonly mode: PipMode | null;
  /** Live document-PiP window, for portalling custom controls into. */
  readonly pipWindow: Window | null;
  readonly error: string | null;
  /** Must be called from a user gesture. */
  request(): Promise<void>;
  exit(): Promise<void>;
  toggle(): void;
}

/** Copies the page's styles so custom PiP UI is not unstyled HTML. */
function adoptStyles(target: Window) {
  const doc = target.document;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const text = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = doc.createElement("style");
      style.textContent = text;
      doc.head.appendChild(style);
    } catch {
      const owner = sheet.ownerNode as HTMLLinkElement | null;
      if (owner?.href) {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = owner.href;
        doc.head.appendChild(link);
      }
    }
  }
  doc.documentElement.className = document.documentElement.className;
  doc.body.className = "bg-background text-foreground";
  doc.body.style.margin = "0";
}

export function usePictureInPicture({
  getVideo,
  onEnter,
  onExit,
}: UsePictureInPictureInput): PictureInPictureHandle {
  const [support, setSupport] = useState<PipSupport>("none");
  const [mode, setMode] = useState<PipMode | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callbacks = useRef({ onEnter, onExit });
  callbacks.current = { onEnter, onExit };

  useEffect(() => setSupport(detectPipSupport()), []);

  const finish = useCallback((closing: PipMode) => {
    setMode(null);
    setPipWindow(null);
    callbacks.current.onExit?.(closing);
  }, []);

  const request = useCallback(async () => {
    setError(null);
    const capability = detectPipSupport();
    if (capability === "none") {
      setError("pip_unsupported");
      return;
    }

    const api = capability === "document" ? documentPip() : null;
    if (api) {
      try {
        const win = await api.requestWindow({ width: 480, height: 300 });
        adoptStyles(win);
        win.addEventListener("pagehide", () => finish("document"), { once: true });
        setPipWindow(win);
        setMode("document");
        callbacks.current.onEnter?.("document");
        return;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "pip_failed");
        return;
      }
    }

    // Element PiP: the browser draws its own controls in the floating window.
    const video = getVideo();
    if (!video || typeof video.requestPictureInPicture !== "function") {
      setError("pip_unsupported");
      return;
    }
    try {
      await video.requestPictureInPicture();
      video.addEventListener("leavepictureinpicture", () => finish("element"), { once: true });
      setMode("element");
      callbacks.current.onEnter?.("element");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "pip_failed");
    }
  }, [finish, getVideo]);

  const exit = useCallback(async () => {
    if (mode === "document") {
      pipWindow?.close();
      finish("document");
      return;
    }
    if (mode === "element") {
      try {
        await document.exitPictureInPicture();
      } catch {
        /* the browser already left PiP */
      }
      finish("element");
    }
  }, [mode, pipWindow, finish]);

  const toggle = useCallback(() => {
    void (mode === null ? request() : exit());
  }, [mode, request, exit]);

  // A page unload must never strand an always-on-top window.
  useEffect(() => {
    if (!pipWindow) return;
    const close = () => pipWindow.close();
    window.addEventListener("pagehide", close);
    return () => window.removeEventListener("pagehide", close);
  }, [pipWindow]);

  return {
    support,
    isSupported: support !== "none",
    isActive: mode !== null,
    mode,
    pipWindow,
    error,
    request,
    exit,
    toggle,
  };
}
