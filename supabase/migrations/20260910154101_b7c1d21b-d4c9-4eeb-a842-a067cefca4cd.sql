-- 1. Geo reference tables: anon sees only active rows
DROP POLICY IF EXISTS "Anyone can read districts" ON public.districts;
CREATE POLICY "Anon read active districts" ON public.districts FOR SELECT TO anon USING (est_actif IS TRUE);
CREATE POLICY "Authenticated read districts" ON public.districts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read regions" ON public.regions;
CREATE POLICY "Anon read active regions" ON public.regions FOR SELECT TO anon USING (est_active IS TRUE);
CREATE POLICY "Authenticated read regions" ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read departements" ON public.departements;
CREATE POLICY "Anon read active departements" ON public.departements FOR SELECT TO anon USING (est_actif IS TRUE);
CREATE POLICY "Authenticated read departements" ON public.departements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read sous_prefectures" ON public.sous_prefectures;
CREATE POLICY "Anon read active sous_prefectures" ON public.sous_prefectures FOR SELECT TO anon USING (est_active IS TRUE);
CREATE POLICY "Authenticated read sous_prefectures" ON public.sous_prefectures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read villages" ON public.villages;
CREATE POLICY "Anon read active villages" ON public.villages FOR SELECT TO anon USING (est_actif IS TRUE);
CREATE POLICY "Authenticated read villages" ON public.villages FOR SELECT TO authenticated USING (true);

-- 2. Profiles: HR read limited to staff profiles only
DROP POLICY IF EXISTS "Profiles select self or hr" ON public.profiles;
CREATE POLICY "Profiles select self admin or hr staff" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.is_rh(auth.uid()) AND public.is_staff(user_id))
);

-- 3. Realtime-published sensitive tables: no anon access, explicit update checks
REVOKE ALL ON public.paiements FROM anon;
REVOKE ALL ON public.souscripteurs FROM anon;
REVOKE ALL ON public.plantations FROM anon;
REVOKE ALL ON public.portail_messages FROM anon;

DROP POLICY IF EXISTS "Staff can update paiements" ON public.paiements;
CREATE POLICY "Staff can update paiements" ON public.paiements
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update souscripteurs" ON public.souscripteurs;
CREATE POLICY "Staff can update souscripteurs" ON public.souscripteurs
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update plantations" ON public.plantations;
CREATE POLICY "Staff can update plantations" ON public.plantations
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));