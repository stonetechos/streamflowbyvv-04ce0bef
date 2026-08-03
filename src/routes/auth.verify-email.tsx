import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell, VerifyEmailPanel } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/**
 * Verification wait-state — Milestone E.
 *
 * The address arrives as a search param so a refresh (or a switch to the
 * mail app and back) does not lose the thread of what is being verified.
 */
export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: z.object({ email: z.string().email().optional() }),
  head: () => ({
    meta: [
      { title: "Verify your email — StreamFlow" },
      {
        name: "description",
        content: "Confirm your email address to finish setting up your StreamFlow account.",
      },
      { property: "og:title", content: "Verify your email — StreamFlow" },
      { property: "og:description", content: "Confirm your email to finish setting up StreamFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useTranslation();
  const { email } = Route.useSearch();

  return (
    <AuthShell
      title={t("auth.verify.title")}
      subtitle={t("auth.verify.subtitle")}
      mood="encouraging"
    >
      <VerifyEmailPanel email={email ?? ""} />
    </AuthShell>
  );
}
