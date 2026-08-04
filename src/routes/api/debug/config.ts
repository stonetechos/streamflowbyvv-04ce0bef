import { createFileRoute } from "@tanstack/react-router";
import { appConfig } from "@/config";

export const Route = createFileRoute("/api/debug/config")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          persistence: {
            isConfigured: appConfig.persistence.isConfigured,
            endpointUrl: appConfig.persistence.endpointUrl,
            publicKeyPresent: Boolean(appConfig.persistence.publicKey),
          },
        });
      },
    },
  },
});
