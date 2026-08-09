/**
 * H12 — theatre box capability detection.
 *
 * The PiP control must never lie about what a browser can do: document PiP
 * when the API exists, element PiP when only the video API exists, and a
 * disabled control otherwise.
 */
import { afterEach, describe, expect, test } from "bun:test";

import { detectPipSupport } from "@/features/theater/use-picture-in-picture";

const globals = globalThis as unknown as { window?: unknown; document?: unknown };
const originalWindow = globals.window;
const originalDocument = globals.document;

afterEach(() => {
  globals.window = originalWindow;
  globals.document = originalDocument;
});

function environment(options: {
  documentPip?: boolean;
  elementPip?: boolean;
  headless?: boolean;
}) {
  if (options.headless) {
    globals.window = undefined;
    globals.document = undefined;
    return;
  }
  globals.window = options.documentPip ? { documentPictureInPicture: {} } : {};
  globals.document = options.elementPip ? { pictureInPictureEnabled: true } : {};
}

describe("H12 picture-in-picture support detection", () => {
  test("prefers document PiP when the browser exposes it", () => {
    environment({ documentPip: true, elementPip: true });
    expect(detectPipSupport()).toBe("document");
  });

  test("falls back to element PiP when only the video API exists", () => {
    environment({ documentPip: false, elementPip: true });
    expect(detectPipSupport()).toBe("element");
  });

  test("reports no support rather than faking a floating window", () => {
    environment({ documentPip: false, elementPip: false });
    expect(detectPipSupport()).toBe("none");
  });

  test("is safe during server rendering", () => {
    environment({ headless: true });
    expect(detectPipSupport()).toBe("none");
  });
});
