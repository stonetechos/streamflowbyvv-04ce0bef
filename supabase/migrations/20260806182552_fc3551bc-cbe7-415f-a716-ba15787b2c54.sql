CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX room_messages_room_created_idx ON public.room_messages (room_id, created_at DESC);

GRANT SELECT, INSERT ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members read room messages"
  ON public.room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));

CREATE POLICY "Room members post their own messages"
  ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_room_member(room_id) AND profile_id = public.current_profile_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;