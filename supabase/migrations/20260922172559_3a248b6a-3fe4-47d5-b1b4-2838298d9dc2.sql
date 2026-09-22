DROP POLICY IF EXISTS "Authenticated read regions" ON public.regions;
CREATE POLICY "Authenticated read active regions" ON public.regions FOR SELECT TO authenticated USING (est_active IS TRUE OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read districts" ON public.districts;
CREATE POLICY "Authenticated read active districts" ON public.districts FOR SELECT TO authenticated USING (est_actif IS TRUE OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read departements" ON public.departements;
CREATE POLICY "Authenticated read active departements" ON public.departements FOR SELECT TO authenticated USING (est_actif IS TRUE OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read sous_prefectures" ON public.sous_prefectures;
CREATE POLICY "Authenticated read active sous_prefectures" ON public.sous_prefectures FOR SELECT TO authenticated USING (est_active IS TRUE OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read villages" ON public.villages;
CREATE POLICY "Authenticated read active villages" ON public.villages FOR SELECT TO authenticated USING (est_actif IS TRUE OR is_admin(auth.uid()));