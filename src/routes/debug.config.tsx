import { createFileRoute } from "@tanstack/react-router";
import { appConfig } from "@/config";

export const Route = createFileRoute("/debug/config")({
  component: DebugConfigPage,
});

function DebugConfigPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Client-side Config</h1>
      <pre className="mt-4 rounded bg-muted p-4 text-sm">
        {JSON.stringify(
          {
            persistence: {
              isConfigured: appConfig.persistence.isConfigured,
              endpointUrl: appConfig.persistence.endpointUrl,
              publicKeyPresent: Boolean(appConfig.persistence.publicKey),
            },
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
