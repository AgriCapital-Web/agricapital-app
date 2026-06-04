-- ====================================================================
-- SECURITY AUDIT FIXES: Tightening RLS and Storage Policies
-- ====================================================================

-- 1. SECURITY DEFINER FUNCTIONS CLEANUP
-- Revoke public execution first, then grant to specific roles
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, anon;

-- 2. TIGHTEN ACCOUNT_REQUESTS
-- Drop the legacy public read policy
DROP POLICY IF EXISTS read_account_requests ON public.account_requests;
-- Ensure SELECT is only for staff/admins
CREATE POLICY "Staff can view account requests"
ON public.account_requests FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 3. TIGHTEN PROFILES
-- Drop legacy overly-permissive policies
DROP POLICY IF EXISTS read_profiles ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
DROP POLICY IF EXISTS authenticated_read_profiles ON public.profiles;

-- Everyone authenticated can see basic profile info (needed for the app to function)
-- But we might want to restrict this further if PII is too sensitive.
-- For now, let's allow authenticated users to read profiles, but ensure NO anon access.
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. TIGHTEN DOCUMENTS
DROP POLICY IF EXISTS read_documents ON public.documents;
DROP POLICY IF EXISTS write_documents ON public.documents;
DROP POLICY IF EXISTS staff_read_documents ON public.documents;
DROP POLICY IF EXISTS staff_write_documents ON public.documents;

CREATE POLICY "Staff manage documents"
ON public.documents FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 5. TIGHTEN PLANTATIONS & SOUSCRIPTEURS
DROP POLICY IF EXISTS read_plantations ON public.plantations;
DROP POLICY IF EXISTS write_plantations ON public.plantations;
DROP POLICY IF EXISTS read_souscripteurs ON public.souscripteurs;
DROP POLICY IF EXISTS write_souscripteurs ON public.souscripteurs;

CREATE POLICY "Staff manage plantations"
ON public.plantations FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff manage souscripteurs"
ON public.souscripteurs FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 6. TIGHTEN CONFIGURATIONS & HISTORIQUE
DROP POLICY IF EXISTS read_configurations ON public.configurations_systeme;
DROP POLICY IF EXISTS write_configurations ON public.configurations_systeme;
DROP POLICY IF EXISTS read_historique ON public.historique_activites;
DROP POLICY IF EXISTS write_historique ON public.historique_activites;

CREATE POLICY "Staff read system config"
ON public.configurations_systeme FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage system config"
ON public.configurations_systeme FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff view history"
ON public.historique_activites FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 7. STORAGE POLICIES FIX
-- The "Public read documents bucket" is dangerous.
DROP POLICY IF EXISTS "Public read documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read docs" ON storage.objects;

-- Allow public read ONLY for photos-profils (needed for UI)
CREATE POLICY "Public read photos-profils"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos-profils');

-- Documents should be staff-only or owner-only
CREATE POLICY "Staff read documents bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND public.is_staff(auth.uid()));

-- 8. RLS ALWAYS TRUE TABLES (Referential data is okay to be true for authenticated)
-- No changes for regions, districts, etc. if they are FOR SELECT ONLY.
-- But ensure they are TO authenticated.
DROP POLICY IF EXISTS "Anyone can read villages" ON public.villages;
CREATE POLICY "Authenticated can read villages" ON public.villages FOR SELECT TO authenticated USING (true);

-- End of fixes
