-- Sprint J.1.5 — truthful refusal facts for a room the caller was pointed at.
-- Resolution only: requires an exact room code or an exact room id, never lists
-- rooms, and returns no playback state or host identifiers. Admission remains
-- RoomFlowService's decision. No RLS policy is widened.

CREATE OR REPLACE FUNCTION public.room_admission_facts(
  _code text DEFAULT NULL,
  _room_id uuid DEFAULT NULL
)
RETURNS TABLE (
  room_id uuid,
  room_name text,
  provider_id uuid,
  host_display_name text,
  member_count integer,
  capacity integer,
  status text,
  is_deleted boolean,
  is_blocked boolean,
  viewer_state text,
  viewer_other_room_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.provider_id,
    host.display_name,
    occupancy.seats::integer,
    r.max_members,
    CASE WHEN r.ended_at IS NOT NULL AND r.status IN ('lobby', 'active')
         THEN 'ended' ELSE r.status END,
    (r.deleted_at IS NOT NULL),
    (
      r.host_profile_id IS NOT NULL
      AND public.is_block_between(r.host_profile_id, public.current_profile_id())
    ),
    viewer.state,
    other.room_id
  FROM public.rooms r
  LEFT JOIN public.profiles host
    ON host.id = r.host_profile_id AND host.deleted_at IS NULL
  CROSS JOIN LATERAL (
    SELECT count(*) AS seats
    FROM public.room_members m
    WHERE m.room_id = r.id
      AND m.state IN ('invited', 'joined')
  ) AS occupancy
  LEFT JOIN LATERAL (
    SELECT m.state
    FROM public.room_members m
    WHERE m.room_id = r.id
      AND m.profile_id = public.current_profile_id()
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS viewer ON TRUE
  LEFT JOIN LATERAL (
    SELECT m.room_id
    FROM public.room_members m
    JOIN public.rooms other_room ON other_room.id = m.room_id
    WHERE m.profile_id = public.current_profile_id()
      AND m.state = 'joined'
      AND m.room_id <> r.id
      AND other_room.deleted_at IS NULL
      AND other_room.ended_at IS NULL
      AND other_room.status IN ('lobby', 'active')
    ORDER BY m.joined_at DESC NULLS LAST
    LIMIT 1
  ) AS other ON TRUE
  WHERE public.current_profile_id() IS NOT NULL
    AND (
      (_room_id IS NOT NULL AND r.id = _room_id)
      OR (_room_id IS NULL AND _code IS NOT NULL AND r.code = _code)
    )
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.room_admission_facts(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_admission_facts(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.room_admission_facts(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_admission_facts(text, uuid) TO service_role;