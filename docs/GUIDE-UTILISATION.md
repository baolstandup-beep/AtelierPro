# Guide d'utilisation

## Journée type en boutique

1. **Ouvrir la caisse** — Caisse → saisir le fond de caisse compté dans le tiroir → *Ouvrir la caisse*.
2. **Vendre** — scanner l'article (ou taper son nom), ajuster les quantités sur le ticket, choisir le client si besoin, la remise si autorisée, le moyen de paiement, puis *Encaisser* (ou touche **F9**).
3. **Imprimer le ticket** depuis la fenêtre de confirmation.
4. **Dépenses payées en espèces** (emballages, transport…) — Dépenses → cocher « Payée avec les espèces de la caisse ouverte » : la sortie est déduite de la caisse.
5. **Clôturer** — Sessions de caisse → la session → compter les espèces → saisir le montant → expliquer l'écart s'il y en a → *Clôturer*. Imprimer le rapport.

## Caisse

- **Paiement mixte** : *Paiement mixte : ajouter un moyen*. Le dernier moyen ajouté se remplit automatiquement avec le reste à payer.
- **Espèces** : saisissez le montant remis, la monnaie à rendre s'affiche.
- **Wave / Orange Money** : vérifiez la réception sur le téléphone de la boutique avant de valider ; la référence de transaction est facultative mais utile au rapprochement.
- **Crédit** : si le client ne paie pas tout, sélectionnez-le ; le reste à payer devient une créance (permission « Vendre à crédit »). Un crédit n'est pas compté comme encaissé.
- **Avoir** : un client qui a un avoir peut l'utiliser comme moyen de paiement.
- **Coupure réseau** : un bandeau prévient et l'encaissement est bloqué. Si la coupure survient pendant la validation, réessayez : la vente ne sera jamais enregistrée deux fois. Le panier est conservé si la page est rechargée.

## Ventes, annulations et retours

- **Ventes** : historique filtrable ; recherche par numéro de ticket.
- **Annuler une vente** (permission dédiée) : motif obligatoire ; le stock est réintégré et chaque paiement est enregistré comme remboursé (les espèces sortent de la caisse ouverte). Impossible si des retours existent déjà.
- **Retour** : fiche de la vente → *Retour / remboursement* → quantités, revendable ou défectueux (ne retourne pas en stock), motif, mode de remboursement (espèces, Wave, OM, virement ou avoir). Un justificatif s'imprime. On ne peut jamais retourner plus que vendu.

## Produits et stock

- **Nouveau produit** : informations, prix, seuil d'alerte, photo, puis une ligne par variante (taille, couleur, contenance). Laissez le code-barres vide pour générer un code interne, ou scannez le code fabricant. Le stock initial crée un mouvement tracé.
- **Import CSV** : Produits → Importer → télécharger le modèle → remplir (Excel : *Enregistrer sous* CSV séparateur point-virgule) → *Analyser* → vérifier l'aperçu → *Importer*. Si une ligne est en erreur, rien n'est importé.
- **Corrections de stock** : fiche produit → icône de stock d'une variante → entrée, sortie ou correction, **motif obligatoire**. L'historique n'est jamais effacé.
- **Inventaire** : Stock → Inventaires → démarrer (tout ou une catégorie) → compter (saisie ou scan : chaque scan ajoute 1) → enregistrer → valider. Seuls les écarts sont appliqués et les ventes faites pendant le comptage sont préservées.
- **Alertes** : Stock et Tableau de bord listent stock faible et ruptures.

## Achats et fournisseurs

1. **Commande** (Achats → Nouvelle commande) : fournisseur, articles, quantités, coûts, n° de facture. Le stock ne bouge pas.
2. **Réception** (fiche de la commande) : quantités réellement reçues (réception partielle possible), coût réel. Le stock augmente une seule fois.
3. **Règlement** : total ou partiel, depuis la commande ou la fiche fournisseur (acompte général). Le solde dû = reçu − réglé.

## Clients

Recherche par nom ou téléphone, historique d'achats, paiements, créance et avoir. **Régler la créance** : le montant est imputé aux ventes les plus anciennes.

## Rapports

Ventes par jour, par mois, par article (avec marges), par catégorie, par employé ; stock valorisé ; faible rotation ; dépenses ; créances ; dettes fournisseurs ; clôtures et écarts ; retours. Chaque rapport s'exporte en **CSV** (s'ouvre dans Excel) et en **PDF** (bouton PDF → Enregistrer au format PDF).

## Administration

- **Utilisateurs** : créer un compte (mot de passe provisoire), choisir le rôle, ajouter des permissions, désactiver, réinitialiser le mot de passe.
- **Réglages** : coordonnées du ticket, plafond de remise des non-administrateurs, seuil par défaut, autorisation exceptionnelle du stock négatif.
- **Journal d'activité** : qui a fait quoi, quand.

## Installer l'application sur téléphone

Chrome Android : menu ⋮ → *Installer l'application* / *Ajouter à l'écran d'accueil*. iPhone (Safari) : bouton Partager → *Sur l'écran d'accueil*.
