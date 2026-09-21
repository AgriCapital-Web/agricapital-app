-- 1) Dedicated finance-role check (money movement)
CREATE OR REPLACE FUNCTION public.is_finance_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','comptable','service_client','chef_equipe_service_client','directeur_tc')
  );
$$;

-- 2) Transfers & refunds: finance roles only (read stays open to staff)
DROP POLICY IF EXISTS "Staff manage transferts" ON public.transferts_paiements;
CREATE POLICY "Staff read transferts" ON public.transferts_paiements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Finance manage transferts" ON public.transferts_paiements
  FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid()))
  WITH CHECK (public.is_finance_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff manage remboursements" ON public.remboursements;
CREATE POLICY "Staff read remboursements" ON public.remboursements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Finance manage remboursements" ON public.remboursements
  FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid()))
  WITH CHECK (public.is_finance_staff(auth.uid()));

-- 3) Only finance roles may create/keep a payment in 'valide' state
DROP POLICY IF EXISTS "Authenticated insert paiements" ON public.paiements;
CREATE POLICY "Staff insert paiements" ON public.paiements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND (statut IS DISTINCT FROM 'valide' OR public.is_finance_staff(auth.uid()))
  );

DROP POLICY IF EXISTS "Staff can update paiements" ON public.paiements;
CREATE POLICY "Staff can update paiements" ON public.paiements
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (
    public.is_staff(auth.uid())
    AND (statut IS DISTINCT FROM 'valide' OR public.is_finance_staff(auth.uid()))
  );

-- 4) Public account requests: entry-level roles only
DROP POLICY IF EXISTS "Public can submit pending account requests" ON public.account_requests;
CREATE POLICY "Public can submit pending account requests" ON public.account_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    statut = 'en_attente'
    AND traite_par IS NULL AND traite_le IS NULL AND motif_rejet IS NULL
    AND nom_complet IS NOT NULL
    AND length(btrim(nom_complet)) BETWEEN 2 AND 120
    AND email IS NOT NULL
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND telephone IS NOT NULL AND length(btrim(telephone)) >= 8
    AND role_souhaite = ANY (ARRAY['commercial','technicien','agent_terrain','user'])
    AND (photo_url IS NULL OR photo_url LIKE '%/storage/v1/object/%/documents/account-requests/%')
    AND (cv_url IS NULL OR cv_url LIKE '%/storage/v1/object/%/documents/account-requests/%')
  );

-- 5) Payment proofs: exact folder matching instead of loose LIKE
DROP POLICY IF EXISTS "Clients read own payment proofs" ON storage.objects;
CREATE POLICY "Clients read own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'preuves-paiement'
    AND EXISTS (
      SELECT 1
      FROM public.paiements pa
      JOIN public.souscripteurs s ON s.id = pa.souscripteur_id
      WHERE s.user_id = auth.uid()
        AND (storage.foldername(objects.name))[1] IN (pa.id::text, s.id::text)
    )
  );