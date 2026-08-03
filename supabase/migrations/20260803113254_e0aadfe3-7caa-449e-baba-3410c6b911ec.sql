DROP POLICY IF EXISTS room_members_insert_host_or_self ON public.room_members;
CREATE POLICY room_members_insert_host_or_self ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_room_host(room_id)
    OR (profile_id = public.current_profile_id() AND role = 'guest')
  );

DROP POLICY IF EXISTS room_members_update_host_or_self ON public.room_members;
CREATE POLICY room_members_update_host_or_self ON public.room_members FOR UPDATE TO authenticated
  USING (public.is_room_host(room_id) OR profile_id = public.current_profile_id())
  WITH CHECK (
    public.is_room_host(room_id)
    OR (
      profile_id = public.current_profile_id()
      AND role = (SELECT m.role FROM public.room_members m WHERE m.id = room_members.id)
    )
  );