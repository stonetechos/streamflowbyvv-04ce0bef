import type { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AppLayout, AppProviders, ErrorState } from "@/app-shell";
import { logger } from "@/foundation/logging";
import { DEFAULT_LOCALE } from "@/shared/constants/locales";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StreamFlow — Watch together, in sync" },
      {
        name: "description",
        content:
          "StreamFlow synchronises playback across your own streaming accounts so you can watch together from anywhere, with voice.",
      },
      { name: "author", content: "Vedora Vision" },
      { property: "og:title", content: "StreamFlow — Watch together, in sync" },
      {
        property: "og:description",
        content:
          "Synchronised watch-together rooms with voice chat, using your own streaming subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b0d12" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      // Milestone L — declares StreamFlow as a share target for installs.
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
});

/**
 * Document shell. `lang`/`dir` render with the default locale and are updated by
 * the LocalizationProvider after hydration, so SSR and client markup agree.
 */
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <AppProviders queryClient={queryClient}>
      <AppLayout>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AppLayout>
    </AppProviders>
  );
}

/**
 * Sprint J.3 — a missed route renders *inside* the root component, so the
 * providers and the app chrome are already mounted. Wrapping again produced a
 * second header, a second "skip to main content" link, and a second set of
 * providers on every 404.
 */
function RootNotFound() {
  const router = useRouter();
  return (
    <ErrorState
      code="SF-SYS-ROUTE-NOT-FOUND"
      messageKey="error.sys.route_not_found"
      onGoHome={() => router.navigate({ to: "/" })}
    />
  );
}

function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    logger.error("Unhandled route error", error, { boundary: "root" });
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <AppProviders queryClient={router.options.context.queryClient}>
      <AppLayout>
        <ErrorState
          code="SF-SYS-UNEXPECTED"
          messageKey="error.sys.unexpected"
          onRetry={() => {
            router.invalidate();
            reset();
          }}
          onGoHome={() => router.navigate({ to: "/" })}
        />
      </AppLayout>
    </AppProviders>
  );
}
