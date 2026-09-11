CREATE OR REPLACE FUNCTION public.rate_limit_leads()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recent_phone INTEGER := 0;
  v_recent_email INTEGER := 0;
  v_recent_global INTEGER := 0;
BEGIN
  -- Only rate-limit anonymous/public submissions; staff inserts are trusted
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.telephone IS NOT NULL AND length(trim(NEW.telephone)) > 0 THEN
    SELECT COUNT(*) INTO v_recent_phone
    FROM public.leads
    WHERE telephone = NEW.telephone
      AND created_at > now() - interval '1 hour';

    IF v_recent_phone >= 3 THEN
      RAISE EXCEPTION 'Trop de demandes pour ce numéro. Veuillez réessayer plus tard.'
        USING ERRCODE = '42901';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    SELECT COUNT(*) INTO v_recent_email
    FROM public.leads
    WHERE lower(email) = lower(NEW.email)
      AND created_at > now() - interval '1 hour';

    IF v_recent_email >= 3 THEN
      RAISE EXCEPTION 'Trop de demandes pour cet email. Veuillez réessayer plus tard.'
        USING ERRCODE = '42901';
    END IF;
  END IF;

  -- Plafond global anti-spam : bloque les vagues massives de soumissions anonymes
  -- (attaquant tournant sur des téléphones/emails jetables).
  SELECT COUNT(*) INTO v_recent_global
  FROM public.leads
  WHERE created_at > now() - interval '1 hour'
    AND created_by IS NULL;

  IF v_recent_global >= 100 THEN
    RAISE EXCEPTION 'Trop de demandes en ce moment. Veuillez réessayer plus tard.'
      USING ERRCODE = '42901';
  END IF;

  RETURN NEW;
END;
$function$