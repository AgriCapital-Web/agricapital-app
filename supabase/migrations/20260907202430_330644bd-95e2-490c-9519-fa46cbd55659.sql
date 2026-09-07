DROP POLICY IF EXISTS "Anon upload account request files only" ON storage.objects;

DROP POLICY IF EXISTS "Staff can update paiements" ON public.paiements;
CREATE POLICY "Staff can update paiements"
ON public.paiements
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (
  public.is_staff(auth.uid())
  AND statut = ANY (ARRAY['en_attente','valide','echoue','annule','rembourse','partiel'])
  AND (montant_paye IS NULL OR montant_paye >= 0)
);