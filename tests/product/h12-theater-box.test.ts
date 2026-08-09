/**
 * H12.1 — caption reading and Picture-in-Picture capability branching.
 *
 * Captions must reflect only what a source actually carries, and the PiP
 * control must never promise a mode the browser cannot deliver.
 */
import { afterEach, describe, expect, test } from "bun:test";

import { captionTrackId, toCaptionTracks } from "@/features/theater/caption-tracks";
import {
  __setPipSupportOverride,
  detectPipSupport,
} from "@/features/theater/use-picture-in-picture";

const globals = globalThis as unknown as { window?: unknown; document?: unknown };
const originalWindow = globals.window;
const originalDocument = globals.document;

afterEach(() => {
  globals.window = originalWindow;
  globals.document = originalDocument;
  __setPipSupportOverride(null);
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

describe("H12.1 capability override seam", () => {
  test("forces the element-PiP branch on a document-PiP browser", () => {
    environment({ documentPip: true, elementPip: true });
    __setPipSupportOverride("element");
    expect(detectPipSupport()).toBe("element");
  });

  test("forces the unsupported branch on a capable browser", () => {
    environment({ documentPip: true, elementPip: true });
    __setPipSupportOverride("none");
    expect(detectPipSupport()).toBe("none");
  });

  test("clearing the override restores real feature detection", () => {
    environment({ documentPip: true, elementPip: true });
    __setPipSupportOverride("none");
    __setPipSupportOverride(null);
    expect(detectPipSupport()).toBe("document");
  });
});

describe("H12.1 caption track reading", () => {
  test("hides captions when the source carries no tracks", () => {
    expect(toCaptionTracks([])).toEqual([]);
  });

  test("keeps subtitle and caption kinds only", () => {
    const tracks = toCaptionTracks([
      { kind: "subtitles", id: "en", label: "English", language: "en" },
      { kind: "captions", id: "hi", label: "हिन्दी", language: "hi" },
      { kind: "descriptions", id: "d", label: "Described", language: "en" },
      { kind: "chapters", id: "c", label: "Chapters", language: "en" },
      { kind: "metadata", id: "m", label: "Meta", language: "en" },
    ]);
    expect(tracks.map((track) => track.id)).toEqual(["en", "hi"]);
  });

  test("falls back to language then position when a track has no label", () => {
    const tracks = toCaptionTracks([
      { kind: "subtitles", id: "", label: "", language: "fr" },
      { kind: "subtitles", id: "", label: "", language: "" },
    ]);
    expect(tracks[0]?.label).toBe("fr");
    expect(tracks[1]?.label).toBe("Track 2");
  });

  test("gives unnamed tracks a positional identity the player can write back", () => {
    expect(captionTrackId({ id: "" }, 0)).toBe("track-0");
    expect(captionTrackId({ id: "en" }, 3)).toBe("en");
  });
});
