# État du projet

## Terminé et vérifié

| Module | État | Vérification |
| --- | --- | --- |
| Authentification, rôles, permissions configurables, désactivation, garde anti-auto-promotion | Fait | Tests SQL + parcours |
| Premier administrateur sécurisé (script) | Fait | Exécuté sur la pile locale (création + refus d'un 2ᵉ bootstrap) |
| Produits, catégories, variantes, photos, codes-barres internes/fabricant, détection des doublons | Fait | Tests SQL + parcours (photo : non testée localement) |
| Import CSV avec aperçu, validation serveur, tout ou rien | Fait | Tests unitaires + SQL |
| Étiquettes Code 128 (rouleau 50×30, planche A4) | Fait | Revue visuelle à faire avec votre imprimante |
| Caisse : scan clavier, caméra, recherche, remise plafonnée, paiement mixte, crédit, avoir, monnaie, idempotence | Fait | Tests SQL + parcours (caméra non testée automatiquement) |
| Tickets 80 mm / 58 mm / A4, justificatif de retour, PDF via navigateur | Fait | Parcours |
| Annulation motivée, retours partiels, remboursements, avoirs, sans double remboursement | Fait | Tests SQL + parcours |
| Stock : mouvements tracés et immuables, corrections motivées, alertes, inventaires | Fait | Tests SQL |
| Achats : commande ≠ réception ≠ règlement, réception partielle unique, dettes | Fait | Tests SQL |
| Clients : fiche, historique, créances, règlements FIFO | Fait | Tests SQL |
| Dépenses (avec ou sans caisse, annulation) | Fait | Tests SQL |
| Sessions de caisse : fond, apports/retraits, solde théorique, comptage, écart motivé, verrouillage, correction tracée, rapport imprimable | Fait | Tests SQL + parcours |
| Tableau de bord et 12 rapports, export CSV | Fait | Tests SQL + parcours |
| Journal d'activité, réglages journalisés | Fait | Tests SQL |
| PWA : manifeste, icônes, installation, cache statique uniquement, page hors ligne, bandeau réseau | Fait | Build ; installation à vérifier sur vos appareils |

## Limites connues (assumées)

- **Pas de vente hors ligne.** Choix délibéré : sans réseau, l'encaissement est bloqué pour éviter doublons et stocks faux. Une vraie file de synchronisation (identifiants d'opération déjà en place côté base) reste possible plus tard.
- **PDF** : produit par la fonction « Enregistrer au format PDF » du navigateur, pas par un générateur serveur.
- **Export Excel** : CSV compatible Excel (UTF-8, `;`) ; pas de fichier `.xlsx` natif (aucune bibliothèque ajoutée).
- **Connexion par téléphone** : non activée (nécessite un fournisseur SMS côté Supabase, payant). Connexion par e-mail.
- **Coût d'achat** : dernier coût reçu, pas de coût moyen pondéré.
- **Une seule boutique** : pas de multi-magasins ni de transferts entre dépôts.
- **Paiements Wave / Orange Money** : saisis manuellement (pas d'intégration API marchande).

## Étapes restantes de votre côté

1. Créer le projet Supabase, appliquer les migrations, désactiver l'inscription publique.
2. Déployer sur Vercel avec les variables d'environnement.
3. Créer la première administratrice (`npm run admin:create`).
4. Tester l'imprimante thermique, la douchette (réglage AZERTY + suffixe Entrée) et la caméra sur les appareils de la boutique.
5. Programmer les sauvegardes (voir SECURITE.md).
