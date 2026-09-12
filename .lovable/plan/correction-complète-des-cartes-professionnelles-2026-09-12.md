# Correction complète des cartes professionnelles

## Résultat attendu
- Reproduire fidèlement les maquettes officielles recto et verso au format 54 × 86 mm.
- Garder le QR net et scannable, la signature, le cachet, les coordonnées et tous les textes entièrement visibles.
- Faire correspondre strictement l’aperçu, le fichier téléchargé et l’impression.
- Ouvrir réellement la caméra depuis chaque bouton de scan, avec un message clair si l’autorisation ou le contexte sécurisé bloque l’accès.
- Traiter automatiquement les nouvelles photos et reprendre les photos existantes : sujet inchangé, détourage, fond gris clair uniforme, cadrage portrait et haute définition.

## Mise en œuvre
1. **Carte recto / verso**
   - Reconstruire les deux faces sur une grille fixe en millimètres d’après les maquettes fournies.
   - Réserver des zones non chevauchantes pour le logo, la photo, l’identité, les quatre informations, le QR, la signature/cachet et les coordonnées.
   - Garder « Carte personnelle – non transférable » sur une ligne avec une taille adaptée.
   - Réduire et borner les valeurs variables plutôt que laisser les textes déplacer la mise en page.

2. **Téléchargement et impression**
   - Exporter les faces depuis une copie dédiée hors écran, toujours montée dans le document, au lieu du contenu conditionnel des onglets.
   - Attendre le chargement des images et des polices avant la capture.
   - Produire des PNG haute définition aux dimensions stables, sans redimensionnement CSS intermédiaire.
   - Vérifier le QR téléchargé avec un vrai lecteur QR.

3. **Scanner caméra**
   - Démarrer la caméra seulement lorsque la fenêtre est réellement ouverte et la vidéo montée.
   - Sélectionner explicitement la caméra arrière, afficher le flux vidéo et gérer permissions, absence de caméra et contexte non sécurisé.
   - Ajouter le scan d’une image locale comme solution de secours lorsque la caméra n’est pas disponible.

4. **Traitement professionnel des photos**
   - Ajouter une fonction sécurisée réservée au personnel autorisé pour détourer le portrait sans retoucher les traits, poser un gris clair uniforme et produire un portrait 3:4 haute définition.
   - Utiliser le même traitement pour chaque nouvel envoi.
   - Ajouter une action d’administration pour retraiter par lot les photos déjà associées aux cartes, sans exposer les fichiers privés.
   - Conserver les originaux et enregistrer la version traitée séparément afin d’éviter toute perte.

5. **Vérification réelle**
   - Tester l’ouverture de la caméra et son état d’erreur dans le navigateur.
   - Télécharger un recto et un verso réels.
   - Contrôler visuellement les fichiers obtenus et décoder le QR exporté.
   - Vérifier les formats ordinateur et mobile, puis corriger tout chevauchement ou contenu coupé restant.

## Détails techniques
- Les photos restent dans le stockage privé `cartes-personnel`; aucune URL permanente n’est enregistrée.
- Le traitement serveur valide le type et la taille du fichier, l’identité de l’appelant et son droit de gérer les cartes.
- Les erreurs de traitement ou de caméra sont affichées explicitement et ne remplacent jamais silencieusement une photo originale.
