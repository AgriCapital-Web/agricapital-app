-- RH/direction level check
CREATE OR REPLACE FUNCTION public.is_rh(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','directeur_tc','directeur_technico_commercial','responsable_operations')
  )
$$;

-- 1) profiles: full row (incl. PII) only for self or RH/admin
DROP POLICY IF EXISTS "Users read own profile or staff read all" ON public.profiles;
CREATE POLICY "Profiles select self or hr"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_rh(auth.uid()));

-- Internal directory (non sensitive columns) for staff
CREATE OR REPLACE VIEW public.profils_annuaire
WITH (security_invoker = off)
AS
SELECT p.id, p.user_id, p.nom_complet, p.email, p.telephone, p.whatsapp,
       p.username, p.photo_url, p.poste, p.departement, p.equipe_id,
       p.district_id, p.region_id, p.actif, p.created_at
FROM public.profiles p
WHERE public.is_staff(auth.uid());

REVOKE ALL ON public.profils_annuaire FROM anon;
GRANT SELECT ON public.profils_annuaire TO authenticated;
GRANT SELECT ON public.profils_annuaire TO service_role;

-- 2) cartes_personnel: verification codes restricted to RH/admin, or own card
DROP POLICY IF EXISTS cartes_select_staff ON public.cartes_personnel;
CREATE POLICY cartes_select_hr_or_own
ON public.cartes_personnel
FOR SELECT
TO authenticated
USING (public.is_rh(auth.uid()) OR profile_id = public.current_profile_id());
