---
name: Cycle 28 ans
description: Cycle souscripteur 28 ans (3 ans installation + 25 ans production), par hectare, taux journalier
type: feature
---
Cycle de vie d'un souscripteur = 28 ans par hectare :
- Phase 1 — Installation : 36 mois (contribution mensuelle par ha).
- Phase 2 — Production : 25 ans (redevance annuelle par ha).
- Tout est continu : pas d'arrêt si le client paie en retard, jours s'accumulent (`jours_retard`).
- Fractionnement par taux journalier : `taux_journalier_ha = montant_total / (28×365) / hectares`.
- DB : `souscripteurs.phase_actuelle/jours_payes/jours_restants/taux_journalier_ha/montant_total_contrat`, `paiements.jours_couverts/periode_debut/periode_fin/phase`, `offres.duree_installation_mois/duree_production_ans/redevance_production_par_ha_an`.
- Vue `v_souscripteur_synthese` consommée par Dashboard + Rapports + portal-api (`?action=synthese`).
- Endpoints portail : `simuler-paiement` (POST montant), `promotions-actives?cible=depot_initial|total_contrat`, `synthese`, `echeances`, `depot-initial`.
- Promotions : champ `cible` = `depot_initial` ou `total_contrat`.