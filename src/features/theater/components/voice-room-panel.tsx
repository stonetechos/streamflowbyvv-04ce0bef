/**
 * Room voice panel — Sprint H6.
 *
 * Voice as the room can honestly offer it. When no transport is configured the
 * panel says so plainly rather than showing dead controls; permission is asked
 * for only after a deliberate tap; and no speaking indicator is ever invented —
 * it is shown only when the transport reports one.
 */
import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { MicPermission } from "@/features/voice/use-microphone-permission";
import type { VoiceSessionModel } from "@/features/voice";

export interface VoiceRoomPanelProps {
  readonly voice: VoiceSessionModel;
  readonly permission: MicPermission;
  readonly isMicSupported: boolean;
  readonly isMutedByHost: boolean;
  readonly onJoin: () => void;
  readonly onLeave: () => void;
  readonly onReconnect: () => void;
  readonly inputDevices: readonly { readonly deviceId: string; readonly label: string }[];
  readonly outputDevices: readonly { readonly deviceId: string; readonly label: string }[];
  readonly inputDeviceId: string | null;
  readonly outputDeviceId: string | null;
  readonly onInputDevice: (deviceId: string) => void;
  readonly onOutputDevice: (deviceId: string) => void;
}

/** One label for the composite of transport state and permission state. */
function stateKey(
  voice: VoiceSessionModel,
  permission: MicPermission,
  isMicSupported: boolean,
): string {
  if (!isMicSupported) return "voice.room.state.unsupported";
  if (!voice.isAvailable) return "voice.room.state.unavailable";
  if (permission === "denied") return "voice.room.state.denied";
  if (permission === "requesting") return "voice.room.state.requesting";
  if (voice.state === "connecting") return "voice.room.state.connecting";
  if (voice.state === "reconnecting") return "voice.room.state.reconnecting";
  if (voice.state === "connected") {
    return voice.isMuted ? "voice.room.state.muted" : "voice.room.state.active";
  }
  if (voice.state === "error") return "voice.room.state.failed";
  if (permission === "prompt" || permission === "unknown") return "voice.room.state.permission";
  return "voice.room.state.disconnected";
}

export function VoiceRoomPanel(props: VoiceRoomPanelProps) {
  const { t } = useTranslation();
  const { voice, permission, isMicSupported } = props;
  const canOfferVoice = isMicSupported && voice.isAvailable;

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-voice-panel>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 className="min-w-0 truncate text-sm font-semibold">{t("voice.room.title")}</h2>
        <span
          className="shrink-0 text-xs text-muted-foreground"
          data-sf-voice-state={voice.state}
          data-sf-voice-permission={permission}
        >
          {t(stateKey(voice, permission, isMicSupported))}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{t("voice.room.privacy")}</p>

      {!canOfferVoice ? (
        <p className="text-xs text-muted-foreground">{t("voice.room.unavailable_help")}</p>
      ) : (
        <>
          {permission === "denied" ? (
            <p className="text-xs text-muted-foreground" role="alert">
              {t("voice.room.denied_help")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {voice.isConnected ? (
              <>
                <ActionButton
                  size="sm"
                  className="min-h-11"
                  tone={voice.isMuted ? "secondary" : "primary"}
                  onClick={() => voice.toggleMute()}
                  data-sf-voice-mute={voice.isMuted ? "muted" : "live"}
                >
                  {voice.isMuted ? t("voice.room.unmute") : t("voice.room.mute")}
                </ActionButton>
                <ActionButton tone="ghost" size="sm" className="min-h-11" onClick={props.onLeave}>
                  {t("voice.room.leave")}
                </ActionButton>
              </>
            ) : (
              <ActionButton
                size="sm"
                className="min-h-11"
                loading={voice.isConnecting || permission === "requesting"}
                disabled={props.isMutedByHost}
                onClick={props.onJoin}
                data-sf-voice-join
              >
                {t("voice.room.join")}
              </ActionButton>
            )}

            {voice.state === "error" || voice.isReconnecting ? (
              <ActionButton
                tone="secondary"
                size="sm"
                className="min-h-11"
                onClick={props.onReconnect}
              >
                {t("voice.room.reconnect")}
              </ActionButton>
            ) : null}
          </div>

          {props.isMutedByHost ? (
            <p className="text-xs text-muted-foreground">{t("voice.room.muted_by_host")}</p>
          ) : null}

          {props.inputDevices.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("voice.room.input_device")}
              <select
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                value={props.inputDeviceId ?? ""}
                onChange={(event) => props.onInputDevice(event.target.value)}
              >
                {props.inputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {props.outputDevices.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("voice.room.output_device")}
              <select
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                value={props.outputDeviceId ?? ""}
                onChange={(event) => props.onOutputDevice(event.target.value)}
              >
                {props.outputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      )}
    </Surface>
  );
}
