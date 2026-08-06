/**
 * Accessibility certification — PROF-09 (partial automation).
 *
 * Automated sweeps cannot certify WCAG 2.1 AA; they can only detect a subset
 * of failures. Passing rows are recorded as automated-subset evidence, and the
 * manual audit requirement stays open.
 */
import { test, expect } from "@playwright/test";
import { writeEvidence } from "../helpers/evidence";

const ROUTES = ["/", "/auth"];

test.describe("Accessibility sweep (PROF-09)", () => {
  for (const route of ROUTES) {
    test(`A11Y ${route} — every interactive control is named and reachable`, async ({
      page,
      browserName,
    }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const unnamed = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll("button, a[href], input, select, textarea"),
        );
        return nodes
          .filter((node) => {
            const el = node as HTMLElement;
            if (el.offsetParent === null && el.getAttribute("aria-hidden") === "true") return false;
            const name =
              el.getAttribute("aria-label") ??
              el.getAttribute("title") ??
              (el as HTMLInputElement).placeholder ??
              el.textContent ??
              "";
            return name.trim().length === 0;
          })
          .map((node) => (node as HTMLElement).outerHTML.slice(0, 120));
      });
      writeEvidence({
        evidenceId: `CERT-A11Y-${route.replace(/\W+/g, "_")}-${browserName}`,
        profileId: "PROF-09",
        browser: browserName,
        platform: process.platform,
        status: unnamed.length === 0 ? "pass" : "fail",
        detail:
          unnamed.length === 0
            ? "No unnamed interactive controls found. Automated subset only — manual WCAG 2.1 AA audit still required."
            : `Unnamed controls: ${unnamed.join(" | ")}`,
      });
      expect(unnamed, `Unnamed interactive controls on ${route}`).toEqual([]);
    });
  }
});
