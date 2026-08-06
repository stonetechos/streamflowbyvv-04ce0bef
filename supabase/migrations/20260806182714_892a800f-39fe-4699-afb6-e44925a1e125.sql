ALTER PUBLICATION supabase_realtime ADD TABLE public.room_state;
ALTER TABLE public.room_state REPLICA IDENTITY FULL;