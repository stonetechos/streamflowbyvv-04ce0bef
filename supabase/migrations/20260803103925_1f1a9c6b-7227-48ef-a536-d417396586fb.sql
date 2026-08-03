DROP POLICY IF EXISTS room_state_select_members ON public.room_state;
CREATE POLICY room_state_select_members ON public.room_state
FOR SELECT TO authenticated
USING (public.is_room_member(room_id) OR public.is_room_host(room_id));