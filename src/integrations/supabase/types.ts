export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accessibility_preferences: {
        Row: {
          captions_default_on: boolean
          created_at: string
          font_scale: number
          high_contrast: boolean
          id: string
          metadata: Json
          mode: string
          profile_id: string
          reduced_motion: boolean
          screen_reader_hints_enabled: boolean
          updated_at: string
        }
        Insert: {
          captions_default_on?: boolean
          created_at?: string
          font_scale?: number
          high_contrast?: boolean
          id?: string
          metadata?: Json
          mode?: string
          profile_id: string
          reduced_motion?: boolean
          screen_reader_hints_enabled?: boolean
          updated_at?: string
        }
        Update: {
          captions_default_on?: boolean
          created_at?: string
          font_scale?: number
          high_contrast?: boolean
          id?: string
          metadata?: Json
          mode?: string
          profile_id?: string
          reduced_motion?: boolean
          screen_reader_hints_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_timeline: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          occurred_at: string
          payload: Json
          profile_id: string
          related_room_id: string | null
          summary_key: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          profile_id: string
          related_room_id?: string | null
          summary_key: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          profile_id?: string
          related_room_id?: string | null
          summary_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_timeline_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_timeline_related_room_id_fkey"
            columns: ["related_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          app_version: string | null
          created_at: string
          event_name: string
          id: string
          locale: string | null
          occurred_at: string
          platform: string | null
          profile_id: string | null
          properties: Json
          room_id: string | null
          session_ref: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          event_name: string
          id?: string
          locale?: string | null
          occurred_at?: string
          platform?: string | null
          profile_id?: string | null
          properties?: Json
          room_id?: string | null
          session_ref?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          event_name?: string
          id?: string
          locale?: string | null
          occurred_at?: string
          platform?: string | null
          profile_id?: string | null
          properties?: Json
          room_id?: string | null
          session_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      appearance_preferences: {
        Row: {
          accent_token: string | null
          compact_room_layout: boolean
          created_at: string
          density: string
          id: string
          metadata: Json
          profile_id: string
          theme_mode: string
          updated_at: string
        }
        Insert: {
          accent_token?: string | null
          compact_room_layout?: boolean
          created_at?: string
          density?: string
          id?: string
          metadata?: Json
          profile_id: string
          theme_mode?: string
          updated_at?: string
        }
        Update: {
          accent_token?: string | null
          compact_room_layout?: boolean
          created_at?: string
          density?: string
          id?: string
          metadata?: Json
          profile_id?: string
          theme_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appearance_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          after_state: Json | null
          before_state: Json | null
          code: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
          occurred_at: string
          reason: string | null
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          code: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          reason?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          code?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          reason?: string | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_profile_id: string
          created_at: string
          id: string
          profile_id: string
          reason: string | null
        }
        Insert: {
          blocked_profile_id: string
          created_at?: string
          id?: string
          profile_id: string
          reason?: string | null
        }
        Update: {
          blocked_profile_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_profile_id_fkey"
            columns: ["blocked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      code_sequences: {
        Row: {
          created_at: string
          current_value: number
          id: string
          padding_width: number
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          padding_width?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          padding_width?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          actor_profile_id: string | null
          aggregate_id: string | null
          aggregate_type: string
          causation_id: string | null
          correlation_id: string | null
          created_at: string
          event_name: string
          event_version: number
          id: string
          occurred_at: string
          payload: Json
          sequence: number | null
        }
        Insert: {
          actor_profile_id?: string | null
          aggregate_id?: string | null
          aggregate_type: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_name: string
          event_version?: number
          id?: string
          occurred_at?: string
          payload?: Json
          sequence?: number | null
        }
        Update: {
          actor_profile_id?: string | null
          aggregate_id?: string | null
          aggregate_type?: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_name?: string
          event_version?: number
          id?: string
          occurred_at?: string
          payload?: Json
          sequence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_assignments: {
        Row: {
          created_at: string
          expires_at: string | null
          feature_flag_id: string
          id: string
          profile_id: string
          source: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature_flag_id: string
          id?: string
          profile_id: string
          source: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature_flag_id?: string
          id?: string
          profile_id?: string
          source?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_assignments_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_value: Json
          deleted_at: string | null
          description: string | null
          id: string
          is_permanent: boolean
          key: string
          rollout_percentage: number
          state: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_value?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_permanent?: boolean
          key: string
          rollout_percentage?: number
          state?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_value?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_permanent?: boolean
          key?: string
          rollout_percentage?: number
          state?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          channel: string
          code: string
          created_at: string
          created_by: string | null
          declined_at: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          invitee_profile_id: string | null
          inviter_profile_id: string | null
          metadata: Json
          revoked_at: string | null
          room_id: string
          status: string
          token_hash: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          channel: string
          code: string
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          invitee_profile_id?: string | null
          inviter_profile_id?: string | null
          metadata?: Json
          revoked_at?: string | null
          room_id: string
          status?: string
          token_hash?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          channel?: string
          code?: string
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          invitee_profile_id?: string | null
          inviter_profile_id?: string | null
          metadata?: Json
          revoked_at?: string | null
          room_id?: string
          status?: string
          token_hash?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invitee_profile_id_fkey"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_profile_id_fkey"
            columns: ["inviter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          direction: string
          english_name: string
          fallback_code: string | null
          is_enabled: boolean
          is_launch_locale: boolean
          native_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          direction?: string
          english_name: string
          fallback_code?: string | null
          is_enabled?: boolean
          is_launch_locale?: boolean
          native_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          direction?: string
          english_name?: string
          fallback_code?: string | null
          is_enabled?: boolean
          is_launch_locale?: boolean
          native_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "languages_fallback_code_fkey"
            columns: ["fallback_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      localization_preferences: {
        Row: {
          auto_detect_enabled: boolean
          created_at: string
          date_format: string
          id: string
          language_code: string
          metadata: Json
          profile_id: string
          region_code: string | null
          time_format_24h: boolean
          updated_at: string
        }
        Insert: {
          auto_detect_enabled?: boolean
          created_at?: string
          date_format?: string
          id?: string
          language_code?: string
          metadata?: Json
          profile_id: string
          region_code?: string | null
          time_format_24h?: boolean
          updated_at?: string
        }
        Update: {
          auto_detect_enabled?: boolean
          created_at?: string
          date_format?: string
          id?: string
          language_code?: string
          metadata?: Json
          profile_id?: string
          region_code?: string | null
          time_format_24h?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "localization_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      localization_strings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_reviewed: boolean
          key: string
          language_code: string
          namespace: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_reviewed?: boolean
          key: string
          language_code: string
          namespace: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_reviewed?: boolean
          key?: string
          language_code?: string
          namespace?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "localization_strings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "localization_strings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          metadata: Json
          profile_id: string
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          type_settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          metadata?: Json
          profile_id: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          type_settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          metadata?: Json
          profile_id?: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          type_settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_key: string
          channel: string
          code: string
          created_at: string
          delivery_status: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          payload: Json
          read_at: string | null
          recipient_profile_id: string
          related_invite_id: string | null
          related_room_id: string | null
          title_key: string
          type: string
          updated_at: string
        }
        Insert: {
          body_key: string
          channel?: string
          code: string
          created_at?: string
          delivery_status?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_profile_id: string
          related_invite_id?: string | null
          related_room_id?: string | null
          title_key: string
          type: string
          updated_at?: string
        }
        Update: {
          body_key?: string
          channel?: string
          code?: string
          created_at?: string
          delivery_status?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_profile_id?: string
          related_invite_id?: string | null
          related_room_id?: string | null
          title_key?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_invite_id_fkey"
            columns: ["related_invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_room_id_fkey"
            columns: ["related_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_checkpoints: {
        Row: {
          captured_at: string
          created_at: string
          drift_ms: number | null
          id: string
          playback_session_id: string
          position_ms: number
          profile_id: string | null
        }
        Insert: {
          captured_at?: string
          created_at?: string
          drift_ms?: number | null
          id?: string
          playback_session_id: string
          position_ms: number
          profile_id?: string | null
        }
        Update: {
          captured_at?: string
          created_at?: string
          drift_ms?: number | null
          id?: string
          playback_session_id?: string
          position_ms?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_checkpoints_playback_session_id_fkey"
            columns: ["playback_session_id"]
            isOneToOne: false
            referencedRelation: "playback_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_checkpoints_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_sessions: {
        Row: {
          average_drift_ms: number | null
          code: string
          content_reference: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          id: string
          max_drift_ms: number | null
          provider_id: string | null
          resync_count: number
          room_id: string
          started_at: string | null
          status: string
          sync_mode: string
          updated_at: string
        }
        Insert: {
          average_drift_ms?: number | null
          code: string
          content_reference?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          max_drift_ms?: number | null
          provider_id?: string | null
          resync_count?: number
          room_id: string
          started_at?: string | null
          status?: string
          sync_mode?: string
          updated_at?: string
        }
        Update: {
          average_drift_ms?: number | null
          code?: string
          content_reference?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          max_drift_ms?: number | null
          provider_id?: string | null
          resync_count?: number
          room_id?: string
          started_at?: string | null
          status?: string
          sync_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playback_sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      po_intents: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          intent_key: string | null
          po_session_id: string
          resolution: string
          utterance_redacted: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          intent_key?: string | null
          po_session_id: string
          resolution?: string
          utterance_redacted?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          intent_key?: string | null
          po_session_id?: string
          resolution?: string
          utterance_redacted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_intents_po_session_id_fkey"
            columns: ["po_session_id"]
            isOneToOne: false
            referencedRelation: "po_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      po_plan_steps: {
        Row: {
          arguments: Json
          completed_at: string | null
          created_at: string
          error_key: string | null
          id: string
          po_plan_id: string
          started_at: string | null
          status: string
          step_order: number
          tool_key: string
          updated_at: string
        }
        Insert: {
          arguments?: Json
          completed_at?: string | null
          created_at?: string
          error_key?: string | null
          id?: string
          po_plan_id: string
          started_at?: string | null
          status?: string
          step_order: number
          tool_key: string
          updated_at?: string
        }
        Update: {
          arguments?: Json
          completed_at?: string | null
          created_at?: string
          error_key?: string | null
          id?: string
          po_plan_id?: string
          started_at?: string | null
          status?: string
          step_order?: number
          tool_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_plan_steps_po_plan_id_fkey"
            columns: ["po_plan_id"]
            isOneToOne: false
            referencedRelation: "po_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      po_plans: {
        Row: {
          code: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          po_intent_id: string | null
          po_session_id: string
          requires_confirmation: boolean
          status: string
          summary_key: string | null
          updated_at: string
        }
        Insert: {
          code: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          po_intent_id?: string | null
          po_session_id: string
          requires_confirmation?: boolean
          status?: string
          summary_key?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          po_intent_id?: string | null
          po_session_id?: string
          requires_confirmation?: boolean
          status?: string
          summary_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_plans_po_intent_id_fkey"
            columns: ["po_intent_id"]
            isOneToOne: false
            referencedRelation: "po_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_plans_po_session_id_fkey"
            columns: ["po_session_id"]
            isOneToOne: false
            referencedRelation: "po_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      po_preference_memories: {
        Row: {
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          memory_key: string
          memory_value: Json
          profile_id: string
          scope: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          memory_key: string
          memory_value?: Json
          profile_id: string
          scope?: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          memory_key?: string
          memory_value?: Json
          profile_id?: string
          scope?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_preference_memories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      po_sessions: {
        Row: {
          channel: string
          code: string
          created_at: string
          ended_at: string | null
          id: string
          profile_id: string
          room_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          code: string
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id: string
          room_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id?: string
          room_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      po_tool_invocations: {
        Row: {
          compliance_decision: string | null
          created_at: string
          duration_ms: number | null
          error_key: string | null
          id: string
          outcome: string
          po_plan_step_id: string
          tool_key: string
        }
        Insert: {
          compliance_decision?: string | null
          created_at?: string
          duration_ms?: number | null
          error_key?: string | null
          id?: string
          outcome?: string
          po_plan_step_id: string
          tool_key: string
        }
        Update: {
          compliance_decision?: string | null
          created_at?: string
          duration_ms?: number | null
          error_key?: string | null
          id?: string
          outcome?: string
          po_plan_step_id?: string
          tool_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_tool_invocations_po_plan_step_id_fkey"
            columns: ["po_plan_step_id"]
            isOneToOne: false
            referencedRelation: "po_plan_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_preferences: {
        Row: {
          allow_invites_from: string
          analytics_opt_in: boolean
          created_at: string
          default_provider_id: string | null
          id: string
          metadata: Json
          po_memory_opt_in: boolean
          presence_visibility: string
          profile_id: string
          updated_at: string
          voice_auto_join: boolean
          voice_join_muted: boolean
          voice_push_to_talk: boolean
        }
        Insert: {
          allow_invites_from?: string
          analytics_opt_in?: boolean
          created_at?: string
          default_provider_id?: string | null
          id?: string
          metadata?: Json
          po_memory_opt_in?: boolean
          presence_visibility?: string
          profile_id: string
          updated_at?: string
          voice_auto_join?: boolean
          voice_join_muted?: boolean
          voice_push_to_talk?: boolean
        }
        Update: {
          allow_invites_from?: string
          analytics_opt_in?: boolean
          created_at?: string
          default_provider_id?: string | null
          id?: string
          metadata?: Json
          po_memory_opt_in?: boolean
          presence_visibility?: string
          profile_id?: string
          updated_at?: string
          voice_auto_join?: boolean
          voice_join_muted?: boolean
          voice_push_to_talk?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "privacy_preferences_default_provider_fk"
            columns: ["default_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          bio: string | null
          code: string
          created_at: string
          deleted_at: string | null
          display_name: string
          handle: string
          id: string
          last_seen_at: string | null
          locale: string
          metadata: Json
          onboarding_completed_at: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          bio?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          handle: string
          id?: string
          last_seen_at?: string | null
          locale?: string
          metadata?: Json
          onboarding_completed_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          bio?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          handle?: string
          id?: string
          last_seen_at?: string | null
          locale?: string
          metadata?: Json
          onboarding_completed_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_capabilities: {
        Row: {
          capability: string
          created_at: string
          id: string
          notes_key: string | null
          provider_id: string
          support_level: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          capability: string
          created_at?: string
          id?: string
          notes_key?: string | null
          provider_id: string
          support_level?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          capability?: string
          created_at?: string
          id?: string
          notes_key?: string | null
          provider_id?: string
          support_level?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_capabilities_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_capabilities_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_compliance_rules: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          provider_id: string
          rationale_key: string
          region_code: string | null
          rule_key: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          provider_id: string
          rationale_key: string
          region_code?: string | null
          rule_key: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          provider_id?: string
          rationale_key?: string
          region_code?: string | null
          rule_key?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_compliance_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_compliance_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_compliance_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_preferences: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          is_hidden: boolean
          last_used_at: string | null
          profile_id: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_hidden?: boolean
          last_used_at?: string | null
          profile_id: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_hidden?: boolean
          last_used_at?: string | null
          profile_id?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_preferences_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          effective_from: string
          id: string
          new_status: string
          previous_status: string | null
          provider_id: string
          reason_key: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          new_status: string
          previous_status?: string | null
          provider_id: string
          reason_key?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          provider_id?: string
          reason_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_status_history_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name_key: string
          homepage_url: string | null
          id: string
          is_enabled: boolean
          key: string
          logo_asset_key: string | null
          metadata: Json
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name_key: string
          homepage_url?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          logo_asset_key?: string | null
          metadata?: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name_key?: string
          homepage_url?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          logo_asset_key?: string | null
          metadata?: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_partners: {
        Row: {
          created_at: string
          id: string
          last_watched_at: string
          partner_profile_id: string
          profile_id: string
          session_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_watched_at?: string
          partner_profile_id: string
          profile_id: string
          session_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_watched_at?: string
          partner_profile_id?: string
          profile_id?: string
          session_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recent_partners_partner_profile_id_fkey"
            columns: ["partner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_partners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          created_at: string
          id: string
          is_muted_by_host: boolean
          joined_at: string | null
          left_at: string | null
          metadata: Json
          profile_id: string
          role: string
          room_id: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_muted_by_host?: boolean
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json
          profile_id: string
          role?: string
          room_id: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_muted_by_host?: boolean
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json
          profile_id?: string
          role?: string
          room_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_presence: {
        Row: {
          clock_offset_ms: number | null
          connection_id: string
          created_at: string
          device_kind: string | null
          id: string
          last_heartbeat_at: string
          latency_ms: number | null
          profile_id: string
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          clock_offset_ms?: number | null
          connection_id: string
          created_at?: string
          device_kind?: string | null
          id?: string
          last_heartbeat_at?: string
          latency_ms?: number | null
          profile_id: string
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          clock_offset_ms?: number | null
          connection_id?: string
          created_at?: string
          device_kind?: string | null
          id?: string
          last_heartbeat_at?: string
          latency_ms?: number | null
          profile_id?: string
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_state: {
        Row: {
          anchor_server_time: string | null
          countdown_target_at: string | null
          created_at: string
          id: string
          last_actor_profile_id: string | null
          playback_rate: number
          playback_status: string
          position_ms: number
          room_id: string
          sync_mode: string
          updated_at: string
          version: number
        }
        Insert: {
          anchor_server_time?: string | null
          countdown_target_at?: string | null
          created_at?: string
          id?: string
          last_actor_profile_id?: string | null
          playback_rate?: number
          playback_status?: string
          position_ms?: number
          room_id: string
          sync_mode?: string
          updated_at?: string
          version?: number
        }
        Update: {
          anchor_server_time?: string | null
          countdown_target_at?: string | null
          created_at?: string
          id?: string
          last_actor_profile_id?: string | null
          playback_rate?: number
          playback_status?: string
          position_ms?: number
          room_id?: string
          sync_mode?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_state_last_actor_profile_id_fkey"
            columns: ["last_actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          content_reference: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ended_at: string | null
          host_profile_id: string | null
          id: string
          join_code_expires_at: string | null
          join_code_hash: string | null
          max_members: number
          metadata: Json
          name: string
          provider_id: string | null
          scheduled_start_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          code: string
          content_reference?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_at?: string | null
          host_profile_id?: string | null
          id?: string
          join_code_expires_at?: string | null
          join_code_hash?: string | null
          max_members?: number
          metadata?: Json
          name: string
          provider_id?: string | null
          scheduled_start_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          code?: string
          content_reference?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_at?: string | null
          host_profile_id?: string | null
          id?: string
          join_code_expires_at?: string | null
          join_code_hash?: string | null
          max_members?: number
          metadata?: Json
          name?: string
          provider_id?: string | null
          scheduled_start_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_events: {
        Row: {
          actor_profile_id: string | null
          client_time: string | null
          created_at: string
          drift_ms: number | null
          event_type: string
          id: string
          payload: Json
          playback_session_id: string | null
          position_ms: number | null
          quality_band: string | null
          room_id: string
          server_time: string
        }
        Insert: {
          actor_profile_id?: string | null
          client_time?: string | null
          created_at?: string
          drift_ms?: number | null
          event_type: string
          id?: string
          payload?: Json
          playback_session_id?: string | null
          position_ms?: number | null
          quality_band?: string | null
          room_id: string
          server_time?: string
        }
        Update: {
          actor_profile_id?: string | null
          client_time?: string | null
          created_at?: string
          drift_ms?: number | null
          event_type?: string
          id?: string
          payload?: Json
          playback_session_id?: string | null
          position_ms?: number | null
          quality_band?: string | null
          room_id?: string
          server_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_events_playback_session_id_fkey"
            columns: ["playback_session_id"]
            isOneToOne: false
            referencedRelation: "playback_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_participants: {
        Row: {
          connection_quality: string
          created_at: string
          id: string
          is_deafened: boolean
          is_muted: boolean
          joined_at: string
          left_at: string | null
          profile_id: string
          status: string
          updated_at: string
          voice_session_id: string
        }
        Insert: {
          connection_quality?: string
          created_at?: string
          id?: string
          is_deafened?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id: string
          status?: string
          updated_at?: string
          voice_session_id: string
        }
        Update: {
          connection_quality?: string
          created_at?: string
          id?: string
          is_deafened?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
          voice_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_participants_voice_session_id_fkey"
            columns: ["voice_session_id"]
            isOneToOne: false
            referencedRelation: "voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          code: string
          created_at: string
          ended_at: string | null
          external_session_ref: string | null
          id: string
          metadata: Json
          peak_participant_count: number
          provider_key: string
          room_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          ended_at?: string | null
          external_session_ref?: string | null
          id?: string
          metadata?: Json
          peak_participant_count?: number
          provider_key?: string
          room_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          ended_at?: string | null
          external_session_ref?: string | null
          id?: string
          metadata?: Json
          peak_participant_count?: number
          provider_key?: string
          room_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_code: { Args: { _prefix: string }; Returns: string }
      current_auth_user_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: { _profile_id: string; _role: string }
        Returns: boolean
      }
      is_block_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_room_controller: { Args: { _room_id: string }; Returns: boolean }
      is_room_host: { Args: { _room_id: string }; Returns: boolean }
      is_room_member: { Args: { _room_id: string }; Returns: boolean }
      is_voice_session_member: {
        Args: { _voice_session_id: string }
        Returns: boolean
      }
      owns_po_plan: { Args: { _po_plan_id: string }; Returns: boolean }
      owns_po_session: { Args: { _po_session_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
