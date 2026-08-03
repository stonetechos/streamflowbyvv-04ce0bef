/**
 * Po lexicon — Milestone H1.
 *
 * The recognition rules and entity extractors the intent engine runs. Kept
 * separate from the engine so a phrasing can be added without touching the
 * scoring logic, and so the whole vocabulary Po understands is readable in one
 * file.
 *
 * Deliberately deterministic. Po's brain must behave identically offline, in a
 * test, and on a device with no model access; a language model may later
 * propose an intent, but it may never widen this vocabulary at runtime
 * (ADR-001 §5 — Po never acts on an intent it cannot name).
 */
import type { PoIntentCategory } from "../po.types";
import type { PoIntentName, PoSlots, PoSlotValue } from "./po-brain.types";

/** Number words Po accepts in place of digits, up to the countdown ceiling. */
const NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
});

/** Words that end a captured name; they belong to the sentence, not the name. */
const NAME_STOP = /\s+(?:to|into|for|in|on|and|then|please|now|room|instead)\b.*$/i;

export function normalizeUtterance(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function extractSeconds(text: string): number | null {
  const digits = /(\d{1,3})\s*(?:seconds?|secs?|s)\b/i.exec(text);
  if (digits?.[1]) return Number.parseInt(digits[1], 10);

  const words = new RegExp(
    `\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b\\s*(?:seconds?|secs?)`,
    "i",
  ).exec(text);
  const word = words?.[1]?.toLowerCase();
  if (word && word in NUMBER_WORDS) return NUMBER_WORDS[word] as number;

  // "start in ten" — a bare number after "in" is still a duration in context.
  const bare = /\bin\s+(\d{1,3})\b/i.exec(text);
  if (bare?.[1]) return Number.parseInt(bare[1], 10);

  const bareWord = new RegExp(`\\bin\\s+(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "i").exec(
    text,
  );
  const bw = bareWord?.[1]?.toLowerCase();
  if (bw && bw in NUMBER_WORDS) return NUMBER_WORDS[bw] as number;

  return null;
}

/** Human-readable room codes only (`ROM-000001`), never a key. */
export function extractRoomCode(text: string): string | null {
  const prefixed = /\b([A-Za-z]{3}-\d{3,10})\b/.exec(text);
  if (prefixed?.[1]) return prefixed[1].toUpperCase();
  const afterKeyword = /\bcode\s+([A-Za-z0-9-]{4,20})\b/i.exec(text);
  return afterKeyword?.[1] ? afterKeyword[1].toUpperCase() : null;
}

/** A person as the user referred to them: a handle, a name, or a code. */
export function extractPerson(text: string): string | null {
  const handle = /@([a-z0-9_]{3,24})\b/i.exec(text);
  if (handle?.[1]) return handle[1].toLowerCase();

  const after =
    /\b(?:invite|add|ask|find|search for|look for|befriend|send a request to|request)\s+(.+)$/i.exec(
      text,
    );
  const captured = after?.[1]?.replace(NAME_STOP, "").trim();
  if (!captured) return null;
  // "invite everyone" is a group reference, not a person.
  if (/^(everyone|everybody|all|them|people|someone|anyone)$/i.test(captured)) return null;
  return captured.replace(/[.?!,]+$/, "");
}

export function extractRoomName(text: string): string | null {
  const quoted = /["“']([^"”']{1,60})["”']/.exec(text);
  if (quoted?.[1]) return quoted[1].trim();
  const named = /\b(?:called|named|titled)\s+(.+)$/i.exec(text);
  const captured = named?.[1]?.replace(NAME_STOP, "").trim();
  return captured ? captured.replace(/[.?!,]+$/, "") : null;
}

/**
 * A provider as spoken. Never resolved here: the catalogue decides whether a
 * provider exists, is selectable, and is compliant (Foundation §11).
 */
export function extractProviderHint(text: string): string | null {
  const after = /\b(?:on|using|via|to watch on|provider)\s+([A-Za-z0-9+ ]{2,24})$/i.exec(text);
  const captured = after?.[1]?.replace(NAME_STOP, "").trim();
  if (captured) return captured.replace(/[.?!,]+$/, "");
  const select = /\b(?:use|pick|choose|select|switch to|set)\s+([A-Za-z0-9+ ]{2,24})$/i.exec(text);
  const chosen = select?.[1]?.replace(NAME_STOP, "").trim();
  return chosen ? chosen.replace(/[.?!,]+$/, "") : null;
}

/** Destinations Po may navigate to. Each is an existing route. */
export const PO_DESTINATIONS = Object.freeze({
  home: "/home",
  people: "/people",
  friends: "/people",
  invites: "/invites",
  invitations: "/invites",
  settings: "/settings",
  account: "/account",
});

export function extractDestination(text: string): string | null {
  for (const key of Object.keys(PO_DESTINATIONS)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) return key;
  }
  return null;
}

/** The only preferences Po may change. Anything else is refused honestly. */
export const PO_SETTING_FIELDS = Object.freeze({
  voice_auto_join: /\b(auto[- ]?join|join automatically)\b/i,
  voice_join_muted: /\b(join muted|start muted|muted on join)\b/i,
  po_memory: /\b(memory|remember things|remembering)\b/i,
});

export function extractSettingField(text: string): string | null {
  for (const [field, pattern] of Object.entries(PO_SETTING_FIELDS)) {
    if (pattern.test(text)) return field;
  }
  return null;
}

/** Explicit on/off only. An ambiguous request becomes a clarification. */
export function extractToggle(text: string): boolean | null {
  if (/\b(turn on|enable|switch on|allow|start)\b/i.test(text)) return true;
  if (/\b(turn off|disable|switch off|stop|don't|do not|never)\b/i.test(text)) return false;
  return null;
}

export function extractNote(text: string): string | null {
  const after = /\b(?:remember|note|keep in mind)\s+(?:that\s+)?(.+)$/i.exec(text);
  const captured = after?.[1]?.trim();
  return captured ? captured.replace(/[.?!]+$/, "") : null;
}

export interface IntentRule {
  readonly name: PoIntentName;
  readonly category: PoIntentCategory;
  readonly patterns: readonly RegExp[];
  /** Slots this intent cannot act without. Asked one at a time. */
  readonly required?: readonly string[];
  extract?(text: string): PoSlots;
}

function slots(entries: Record<string, PoSlotValue | null>): PoSlots {
  const out: Record<string, PoSlotValue> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== null && value !== "") out[key] = value;
  }
  return out;
}

/**
 * Order matters: the first rule whose pattern matches with the highest
 * coverage wins, so specific phrasings are listed before general ones.
 */
export const PO_INTENT_RULES: readonly IntentRule[] = [
  // ── Conversation control ────────────────────────────────────────────────
  {
    name: "conversation.cancel",
    category: "informational",
    patterns: [/^(cancel|never ?mind|forget it|stop|abort|leave it)\b/i],
  },
  {
    name: "conversation.confirm",
    category: "informational",
    patterns: [/^(yes|yeah|yep|sure|ok|okay|do it|go ahead|please do|confirm)\b/i],
  },
  {
    name: "conversation.decline",
    category: "informational",
    patterns: [/^(no|nope|not now|don't|do not|later)\b/i],
  },

  // ── Countdown ───────────────────────────────────────────────────────────
  {
    name: "countdown.cancel",
    category: "playback_sync",
    patterns: [/\b(cancel|stop|call off)\b.*\bcountdown\b/i, /\bcountdown\b.*\b(cancel|stop)\b/i],
  },
  {
    name: "countdown.set_duration",
    category: "playback_sync",
    patterns: [
      /\b(?:start|begin|go|play)\b.*\bin\b.*\b(?:\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty)\b/i,
      /\b(?:set|make|change)\b.*\bcountdown\b/i,
      /\bcountdown\b.*\b(?:to|of)\b/i,
    ],
    required: ["seconds"],
    extract: (text) => slots({ seconds: extractSeconds(text) }),
  },
  {
    name: "countdown.start",
    category: "playback_sync",
    patterns: [
      /\b(start|begin|run)\b.*\bcountdown\b/i,
      /^(?:let's\s+)?(?:start|begin)\b\s*(?:the\s+)?(?:party|session|watch)?\s*$/i,
    ],
  },

  // ── Rooms ───────────────────────────────────────────────────────────────
  {
    name: "room.join_by_code",
    category: "room_control",
    patterns: [/\bjoin\b.*\b(?:room|code)\b/i, /\bjoin\b\s+[A-Za-z]{3}-\d{3,10}\b/i],
    required: ["room_code"],
    extract: (text) => slots({ room_code: extractRoomCode(text) }),
  },
  {
    name: "room.create",
    category: "room_control",
    patterns: [
      /\b(create|make|start|open|set up|host)\b.*\b(room|watch party|party|session)\b/i,
      /\bnew room\b/i,
    ],
    extract: (text) => slots({ room_name: extractRoomName(text) }),
  },
  {
    name: "room.close",
    category: "room_control",
    patterns: [/\b(close|end|finish|shut down|wrap up)\b.*\b(room|party|session)\b/i],
  },
  {
    name: "room.leave",
    category: "room_control",
    patterns: [/\b(leave|exit|get out of|drop out of)\b.*\b(room|party|session)\b/i, /^leave$/i],
  },
  {
    name: "room.set_ready",
    category: "room_control",
    patterns: [/\b(i'?m|i am|mark me|set me)\b.*\bready\b/i, /^ready$/i],
  },
  {
    name: "room.status",
    category: "informational",
    patterns: [
      /\b(who'?s|who is|how many)\b.*\b(here|in the room|joined|waiting)\b/i,
      /\b(room|party)\b.*\b(status|state)\b/i,
      /\bwhat'?s happening\b/i,
    ],
  },
  {
    name: "room.list_recent",
    category: "informational",
    patterns: [/\b(recent|last|previous|past)\b.*\brooms?\b/i, /\brooms?\b.*\brecently\b/i],
  },

  // ── Invitations ─────────────────────────────────────────────────────────
  {
    name: "invite.list_pending",
    category: "invitation",
    patterns: [
      /\b(pending|open|outstanding|any)\b.*\binvit/i,
      /\binvit\w*\b.*\b(pending|waiting|do i have)\b/i,
      /\bdo i have any invit/i,
    ],
  },
  {
    name: "invite.accept",
    category: "invitation",
    patterns: [/\b(accept|take|join)\b.*\binvit/i],
  },
  {
    name: "invite.decline",
    category: "invitation",
    patterns: [/\b(decline|reject|refuse|dismiss)\b.*\binvit/i],
  },
  {
    name: "invite.create",
    category: "invitation",
    patterns: [/\b(invite|ask)\b\s+\S+/i, /\bsend\b.*\binvit/i],
    required: ["person"],
    extract: (text) => slots({ person: extractPerson(text) }),
  },

  // ── Providers ───────────────────────────────────────────────────────────
  {
    name: "provider.list",
    category: "provider_action",
    patterns: [
      /\b(which|what|list|show)\b.*\b(services?|providers?)\b/i,
      /\bproviders?\b.*\b(available|supported)\b/i,
    ],
  },
  {
    name: "provider.select",
    category: "provider_action",
    patterns: [
      /\b(watch|use|pick|choose|select|switch to|set)\b.*\b(on|to)?\b.*\b(netflix|youtube|prime|disney|hotstar|jiocinema|sonyliv|zee5|apple tv|local file|provider)\b/i,
      /\bset\b.*\bprovider\b/i,
    ],
    required: ["provider_hint"],
    extract: (text) => slots({ provider_hint: extractProviderHint(text) }),
  },

  // ── Voice ───────────────────────────────────────────────────────────────
  {
    name: "voice.unmute",
    category: "voice_control",
    patterns: [/\bunmute\b/i, /\b(turn on|open)\b.*\b(mic|microphone)\b/i],
  },
  {
    name: "voice.mute",
    category: "voice_control",
    patterns: [/\bmute\b/i, /\b(turn off|close)\b.*\b(mic|microphone)\b/i],
  },
  {
    name: "voice.join",
    category: "voice_control",
    patterns: [/\b(join|connect to|start)\b.*\b(voice|call|audio)\b/i],
  },
  {
    name: "voice.leave",
    category: "voice_control",
    patterns: [/\b(leave|hang up|disconnect|end)\b.*\b(voice|call|audio)\b/i],
  },

  // ── Synchronization ─────────────────────────────────────────────────────
  {
    name: "sync.resync",
    category: "playback_sync",
    patterns: [/\b(re-?sync|resynchronis|resynchroniz|measure again|check my clock)\b/i],
  },
  {
    name: "sync.status",
    category: "informational",
    patterns: [
      /\b(sync|synchronis|synchroniz|drift|clock)\b.*\b(status|health|how|good|ok)\b/i,
      /\bare we in sync\b/i,
    ],
  },

  // ── Social ──────────────────────────────────────────────────────────────
  {
    name: "partners.list",
    category: "informational",
    patterns: [/\b(recent|last)\b.*\b(partners?|watched with)\b/i, /\bwho (have|did) i watch\b/i],
  },
  {
    name: "friend.request",
    category: "informational",
    patterns: [
      /\b(add|befriend|send a (friend )?request to)\b\s+\S+/i,
      /\bfriend request\b.*\bto\b/i,
    ],
    required: ["person"],
    extract: (text) => slots({ person: extractPerson(text) }),
  },
  {
    name: "friend.search",
    category: "informational",
    patterns: [/\b(find|search for|look for|look up)\b\s+\S+/i],
    required: ["person"],
    extract: (text) => slots({ person: extractPerson(text) }),
  },
  {
    name: "friend.list",
    category: "informational",
    patterns: [/\b(my )?friends?\b/i, /\bwho'?s online\b/i],
  },

  // ── Memory ──────────────────────────────────────────────────────────────
  {
    name: "memory.forget",
    category: "settings",
    patterns: [/\b(forget|delete)\b.*\b(that|memory|what i said)\b/i],
  },
  {
    name: "memory.list",
    category: "settings",
    patterns: [/\bwhat do you remember\b/i, /\b(my )?memories\b/i],
  },
  {
    name: "memory.remember",
    category: "settings",
    patterns: [/\b(remember|note|keep in mind)\b\s+\S+/i],
    required: ["note"],
    extract: (text) => slots({ note: extractNote(text) }),
  },

  // ── Settings ────────────────────────────────────────────────────────────
  {
    name: "settings.set",
    category: "settings",
    patterns: [
      /\b(turn (on|off)|enable|disable)\b.*\b(auto[- ]?join|join muted|memory)\b/i,
      /\b(auto[- ]?join|join muted|memory)\b.*\b(on|off)\b/i,
    ],
    required: ["field", "enabled"],
    extract: (text) => slots({ field: extractSettingField(text), enabled: extractToggle(text) }),
  },
  {
    name: "settings.get",
    category: "settings",
    patterns: [/\b(my )?(settings|preferences)\b/i],
  },

  // ── Navigation and meta ─────────────────────────────────────────────────
  {
    name: "navigate.to",
    category: "informational",
    patterns: [
      /\b(open|go to|take me to|show me)\b\s+(the\s+)?(home|people|friends|invites|invitations|settings|account)\b/i,
    ],
    required: ["destination"],
    extract: (text) => slots({ destination: extractDestination(text) }),
  },
  {
    name: "home.overview",
    category: "informational",
    patterns: [/\b(what can i do|catch me up|anything new|what'?s waiting)\b/i],
  },
  {
    name: "capability.list",
    category: "informational",
    patterns: [/\b(what can you do|help|your abilities|commands)\b/i],
  },
];
