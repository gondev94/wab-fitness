-- Cupo atómico: bloquear la sesión, contar Confirmed e insertar en la misma transacción.
-- Ejecutar en el SQL editor de Supabase o con `supabase db push`.

CREATE OR REPLACE FUNCTION public.create_booking(p_user_id uuid, p_session_id uuid)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_max integer;
  v_count integer;
  v_booking public.bookings;
BEGIN
  PERFORM 1 FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  SELECT s.status,
         COALESCE(s.max_capacity, tt.max_capacity)
    INTO v_status, v_max
    FROM public.sessions s
    LEFT JOIN public.training_types tt ON tt.id = s.training_type_id
   WHERE s.id = p_session_id;

  IF v_status IS DISTINCT FROM 'Open' THEN
    RAISE EXCEPTION 'SESSION_NOT_OPEN';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.bookings
     WHERE session_id = p_session_id
       AND user_id = p_user_id
       AND status IN ('Confirmed', 'WaitList')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING';
  END IF;

  SELECT COUNT(*)::integer
    INTO v_count
    FROM public.bookings
   WHERE session_id = p_session_id
     AND status = 'Confirmed';

  INSERT INTO public.bookings (user_id, session_id, status)
  VALUES (
    p_user_id,
    p_session_id,
    CASE
      WHEN v_max IS NOT NULL AND v_count >= v_max THEN 'WaitList'
      ELSE 'Confirmed'
    END
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING';
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid) TO service_role;
