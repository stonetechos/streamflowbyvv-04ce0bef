CREATE POLICY room_state_insert_host ON public.room_state
FOR INSERT TO authenticated
WITH CHECK (public.is_room_host(room_id) OR public.is_room_controller(room_id));