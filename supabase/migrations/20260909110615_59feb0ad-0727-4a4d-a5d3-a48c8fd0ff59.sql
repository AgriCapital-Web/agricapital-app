DROP VIEW IF EXISTS public.profils_annuaire;

CREATE OR REPLACE FUNCTION public.annuaire_staff()
RETURNS TABLE (
  id uuid, user_id uuid, nom_complet text, email text, telephone text,
  whatsapp text, username text, photo_url text, poste text, departement text,
  equipe_id uuid, district_id uuid, region_id uuid, actif boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.nom_complet, p.email, p.telephone, p.whatsapp,
         p.username, p.photo_url, p.poste, p.departement, p.equipe_id,
         p.district_id, p.region_id, p.actif, p.created_at
  FROM public.profiles p
  WHERE public.is_staff(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.annuaire_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annuaire_staff() TO authenticated, service_role;

CREATE VIEW public.profils_annuaire
WITH (security_invoker = on)
AS SELECT * FROM public.annuaire_staff();

REVOKE ALL ON public.profils_annuaire FROM anon;
GRANT SELECT ON public.profils_annuaire TO authenticated, service_role;
