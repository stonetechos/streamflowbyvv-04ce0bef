/**
 * Domain events public surface — Sprint 1.6.
 */
export {
  createEventBus,
  type CatalogEvent,
  type EventBus,
  type EventBusOptions,
  type EventPublisher,
  type EventSubscriber,
} from "./event-bus";
export {
  describeEvent,
  EVENT_CATALOG,
  isKnownEvent,
  type DomainEventName,
  type DomainEventPayloads,
  type EventDescriptor,
  type FeatureFlagEventPayloads,
  type IdentityEventPayloads,
  type InvitationEventPayloads,
  type PlaybackEventPayloads,
  type PoEventPayloads,
  type ProviderEventPayloads,
  type RoomEventPayloads,
  type VoiceEventPayloads,
} from "./event-catalog";
export {
  AGGREGATE_TYPES,
  systemClock,
  type AggregateType,
  type CausationId,
  type Clock,
  type CorrelationId,
  type DomainEvent,
  type EventHandler,
  type EventMetadata,
  type EventName,
  type EventSubscription,
  type Unsubscribe,
} from "./event.types";
