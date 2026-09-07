CREATE OR REPLACE FUNCTION public.enforce_souscripteur_refund_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY['refund_requested_at','refund_reason','updated_at'];
  k text;
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
BEGIN
  IF current_user IN ('service_role', 'postgres')
     OR current_role IN ('service_role', 'postgres')
     OR session_user IN ('service_role', 'postgres')
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-staff (subscriber portal): whitelist strictly the refund request columns.
  FOR k IN SELECT jsonb_object_keys(new_j) LOOP
    IF NOT (k = ANY(allowed)) AND (new_j -> k) IS DISTINCT FROM (old_j -> k) THEN
      RAISE EXCEPTION 'Seuls les champs de demande de remboursement peuvent être modifiés (champ interdit: %)', k;
    END IF;
  END LOOP;

  -- A refund request can only be created once, never edited or cleared.
  IF OLD.refund_requested_at IS NOT NULL
     AND (NEW.refund_requested_at IS DISTINCT FROM OLD.refund_requested_at
          OR NEW.refund_reason IS DISTINCT FROM OLD.refund_reason) THEN
    RAISE EXCEPTION 'Une demande de remboursement déjà enregistrée ne peut pas être modifiée';
  END IF;

  IF NEW.refund_requested_at IS NULL THEN
    RAISE EXCEPTION 'Demande de remboursement invalide';
  END IF;

  NEW.refund_requested_at := now();
  RETURN NEW;
END;
$function$;