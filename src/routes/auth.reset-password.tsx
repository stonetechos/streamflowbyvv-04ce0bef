import { createFileRoute } from "@tanstack/react-router";

import { AuthShell, ResetPasswordForm } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/**
 * New-password surface — Sprint H1.6 §1.
 *
 * Reached from a recovery email by way of `/auth/callback`. Public by design:
 * the person is mid-recovery and the form itself refuses to act without the
 * session the emailed link established.
 */
export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — StreamFlow" },
      {
        name: "description",
        content: "Set a new password for your StreamFlow account.",
      },
      { property: "og:title", content: "Choose a new password — StreamFlow" },
      { property: "og:description", content: "Set a new StreamFlow password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t("auth.reset_password.title")}
      subtitle={t("auth.reset_password.subtitle")}
      mood="observing"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
