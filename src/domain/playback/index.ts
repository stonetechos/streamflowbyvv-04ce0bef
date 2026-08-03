/**
 * Playback domain surface — Sprint 2.4.
 * Orchestration models only: what playback should do, never how a provider
 * does it. No player, no provider SDK, no browser control lives below here.
 */
export {
  PLAYBACK_ACTIONS,
  PLAYBACK_MACHINE_STATES,
  canPlaybackTransition,
  isPlaybackActive,
  isPlaybackAdvancing,
  isPlaybackMachineState,
  isPlaybackTerminal,
  nextPlaybackState,
  type PlaybackAction,
  type PlaybackMachineState,
} from "./playback-machine";
export {
  IDLE_TIMELINE,
  PLAYBACK_INTENT_KINDS,
  createPlaybackIntent,
  createTimeline,
  normalizePosition,
  positionAt,
  type IsoInstant,
  type PlaybackIntent,
  type PlaybackIntentKind,
  type PlaybackSession,
  type PlaybackSnapshot,
  type PlaybackTimeline,
} from "./playback.types";
export {
  PLAYBACK_CORRECTION_KINDS,
  PLAYBACK_SYNC_DECISIONS,
  createPlaybackAnchor,
  type ParticipantPlaybackReport,
  type PlaybackAnchor,
  type PlaybackCorrection,
  type PlaybackCorrectionKind,
  type PlaybackCorrectionReason,
  type PlaybackDelta,
  type PlaybackHealth,
  type PlaybackPosition,
  type PlaybackSyncDecision,
  type PlaybackSyncSnapshot,
} from "./playback-sync.types";
export {
  classifyPlaybackDrift,
  correctionFor,
  deltaFor,
  isHardCorrectionEligible,
  isPlaybackInSync,
  isSoftCorrectionEligible,
  positionFromAnchor,
  worstDelta,
} from "./playback-drift-policy";
export {
  createPlaybackSyncEngine,
  resolvePlaybackSyncEngineDependencies,
  PLAYBACK_SYNC_ENGINE,
  type PlaybackSyncEngine,
  type PlaybackSyncEngineDependencies,
  type PlaybackSyncInput,
} from "./playback-sync-engine";
export {
  PLAYBACK_ANCHOR_METADATA_KEY,
  PLAYBACK_DURATION_METADATA_KEY,
  PLAYBACK_END_REASON_METADATA_KEY,
  PLAYBACK_ENDED_AT_METADATA_KEY,
  PLAYBACK_ERROR_METADATA_KEY,
  PLAYBACK_OWNER_METADATA_KEY,
  PLAYBACK_POSITION_METADATA_KEY,
  PLAYBACK_REVISION_METADATA_KEY,
  PLAYBACK_SESSION_ID_METADATA_KEY,
  PLAYBACK_STARTED_AT_METADATA_KEY,
  PLAYBACK_STATE_METADATA_KEY,
  PLAYBACK_SYNC_MODE_METADATA_KEY,
  idlePlaybackRuntime,
  projectPlayback,
  readPlaybackRuntime,
  toSession,
  toTimeline,
  writePlaybackRuntime,
  type PlaybackMetadataRecord,
  type PlaybackRuntime,
} from "./playback-runtime";
