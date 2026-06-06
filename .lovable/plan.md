## Objectif

Brancher tout le cycle de vie d'un souscripteur — de la validation des documents au paiement du dépôt initial, jusqu'au compteur 36 mois et aux redevances mensuelles — pour que **chaque table et chaque page** (Dashboard, Souscripteurs, Propriétaires, Parcelles, Plantations, Gestion Paiements, Commissions, Portefeuilles, Équipes, Rapports, Tickets, Paramètres, Portail client) reste cohérente en temps réel.

---

## 1. Migration DB — Automatisation cycle de vie

**Nouvelles colonnes `souscripteurs`**
- `documents_valides_at timestamptz` — set quand toutes les annexes obligatoires sont `valide`
- `compte_actif boolean default false` — débloqué après paiement DA
- `da_paye_at timestamptz` — date de réception DA validé
- `contrat_debut_at date` — début des 36 mois (= `da_paye_at::date`)
- `contrat_fin_at date` — `+ interval '36 months'`
- `mensualite_montant numeric` — `offre.contribution_mensuelle_par_ha * total_hectares`
- `prochaine_echeance date`

**Nouvelles colonnes `paiements`** (si absentes)
- `numero_echeance int`, `est_depot_initial boolean default false`

**Triggers**
1. `trg_check_documents_souscription` (AFTER UPDATE on `documents_souscription`) : si tous les docs requis du souscripteur sont `valide` → set `documents_valides_at` + appelle `create_depot_initial(souscripteur_id)`.
2. `create_depot_initial()` (function) : INSERT dans `paiements` une ligne `type_paiement='DA'`, `est_depot_initial=true`, `statut='en_attente'`, `montant = offre.montant_da_par_ha * total_hectares`, `souscripteur_id=...`. Idempotent (vérifie existence).
3. `trg_paiement_valide` (AFTER UPDATE on `paiements`) : si `est_depot_initial=true` ET `statut='valide'` ET ancien ≠ valide :
   - update `souscripteurs` set `compte_actif=true`, `da_paye_at=now()`, `contrat_debut_at=current_date`, `contrat_fin_at=current_date+interval '36 months'`, `prochaine_echeance=current_date+interval '1 month'`.
   - INSERT 36 paiements REDEVANCE futurs avec `date_echeance` mensuelles + `numero_echeance` 1..36.
   - INSERT notification souscripteur + staff.
   - INSERT/UPDATE `commissions` pour le commercial responsable selon `grille_remuneration`.
4. `trg_paiement_redevance_valide` : à chaque redevance validée → update `prochaine_echeance`, recalcule retards, incrémente `portefeuilles.solde_commissions`.
5. `trg_paiement_retard` (job cron quotidien) : marque `statut='en_retard'` les échéances dépassées et envoie notif.

**Vue agrégée `v_souscripteur_synthese`** : exposée pour Dashboard & Portail (total payé, restant dû, % avancement contrat, jours restants).

---

## 2. Webhook KKiaPay / Wave

Edge function `kkiapay-webhook` et `wave-notification` :
- Vérifie signature (déjà fait).
- Sur succès → UPDATE `paiements` set `statut='valide'`, `montant_paye`, `date_paiement`, `kkiapay_transaction_id`. Le trigger ci-dessus prend le relais.
- INSERT `kkiapay_events` (audit).
- Retourne 200 rapidement.

Ajoute polling 10×2s sur la page de retour paiement portail/CRM, comme pattern recommandé.

---

## 3. Realtime + invalidation cache front

- Activer realtime sur : `paiements`, `souscripteurs`, `plantations`, `commissions`, `portefeuilles`, `notifications`, `documents_souscription`.
- Wrapper `useRealtimeTable(table)` réutilisé par chaque page concernée pour `queryClient.invalidateQueries`.
- Dashboard, Gestion Paiements, Portefeuilles, Commissions, Souscripteurs, Plantations, Rapports : remplacer les fetch statiques par React Query + invalidation realtime.

---

## 4. Pages à corriger / brancher

| Page | Changement |
|---|---|
| Dashboard | KPI réels via `v_souscripteur_synthese`, alertes retard, prochaines échéances |
| Souscripteurs | Badge `compte_actif`, bouton "Forcer validation docs", lien dépôt |
| Propriétaires | FK vers parcelles OK, stats temps réel |
| Parcelles | Surface attribuée live, lien lots/souscripteurs |
| Plantations | Statut global mis à jour quand DA validé |
| Gestion Paiements | Filtre `est_depot_initial`, action "Valider", génère reçu |
| Commissions | Lecture auto via trigger, statut `en_attente`/`payee` |
| Portefeuilles | Solde live, demandes retrait |
| Équipes | Stats commerciaux (souscripteurs créés, DA encaissés) |
| Rapports Tech/Fin | Requêtes basées sur nouvelles colonnes |
| Tickets | Realtime |
| Paramètres | Onglet "Grille rémunération", "Promotions DA" |
| Portail (`portal-api`) | Endpoint `depot-initial` → renvoie paiement à payer + bouton KKiaPay ; endpoint `echeances` → liste 36 redevances |

---

## 5. Sécurité / RLS

- Vérifier policies INSERT/UPDATE manquantes sur `commissions`, `portefeuilles`, `notifications`.
- Le trigger tourne en `SECURITY DEFINER` → pas d'impact RLS.
- Souscripteur peut SELECT ses propres `paiements` (déjà), `commissions` non (privé staff).

---

## 6. Tests

Ajouter `src/test/payment-lifecycle.test.ts` :
- Validation docs → dépôt créé.
- Webhook → compte_actif, 36 échéances, commission.
- Redevance payée → portefeuille incrémenté.

---

## 7. Livraison

1. Migration SQL (étape 1).
2. Edge functions webhook (étape 2).
3. Hook realtime + refacto pages (étapes 3-4).
4. Portail dépôt initial (étape 4).
5. Tests + scan sécurité (étape 5-6).

**Confirme et je lance la migration puis le reste en parallèle.**