# Sécurité, rôles et sauvegardes

## Rôles et permissions

| Rôle | Droits par défaut |
| --- | --- |
| Administrateur / gérant | Tout |
| Caissier | Caisse (vente, remise plafonnée), ouverture/clôture de caisse, clients |
| Gestionnaire de stock | Produits, stock, inventaires, achats, fournisseurs |
| Employé | Consultation des produits, plus les permissions cochées individuellement |

Le gestionnaire peut ajouter des permissions à n'importe quel compte (ex. `returns.manage` à un caissier de confiance). Les permissions sont stockées en base et vérifiées **à trois niveaux** :

1. **Base de données** — chaque fonction métier commence par `require_permission(...)` ; chaque table a la RLS activée ; les rôles API n'ont que les privilèges nécessaires (ex. aucune écriture directe sur `sales`, `payments`, `stock_movements` ; la colonne `stock_qty` n'est pas modifiable, un déclencheur l'impose même à un superutilisateur).
2. **Serveur** — chaque action serveur (`lib/actions/*`) et route API re-vérifie la session et la permission avant d'appeler la base.
3. **Interface** — les menus et boutons non autorisés sont masqués (confort uniquement, jamais une sécurité).

Garde-fous supplémentaires :

- personne ne peut modifier son propre rôle, ses permissions ni son statut ; il reste toujours au moins un administrateur actif ;
- un compte inscrit hors application est créé **inactif et sans droits** ; un compte désactivé perd immédiatement l'accès aux données (et est banni côté Auth) ;
- historique non modifiable : mouvements de stock et de caisse, paiements, remboursements et journal d'audit refusent toute modification/suppression ;
- une session de caisse clôturée est verrouillée ; seule une correction motivée (`cash.correct`) est possible et elle est journalisée ;
- les prix, remises, totaux et monnaie sont recalculés en base : un total envoyé par le navigateur n'est jamais utilisé ;
- opérations rejouables sans doublon : vente, retour, réception, règlements portent un identifiant d'opération unique (verrou consultatif + contrainte d'unicité).

## Journalisation

Remises, ventes à crédit, annulations, retours, ouvertures/clôtures/corrections de caisse, apports/retraits, dépenses et annulations, mouvements de stock manuels, inventaires, achats et règlements, créations/modifications de comptes, réglages. Consultation : **Journal d'activité** (`audit.view`).

## Connexion

- E-mail + mot de passe (Supabase Auth). Limitation : 5 échecs par couple e-mail/IP → blocage 15 minutes (table `login_attempts`, accessible uniquement avec la clé serveur), en plus des limites Supabase.
- Messages d'erreur identiques que le compte existe ou non ; réinitialisation par lien e-mail.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` : uniquement dans les variables d'environnement serveur (Vercel), jamais préfixée `NEXT_PUBLIC_`, jamais committée (`.env*.local` est ignoré par git).
- En cas de fuite : Supabase → *Project Settings → API → Roll* la clé, mettez à jour Vercel, redéployez.
- En-têtes de sécurité (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`) définis dans `next.config.ts`.

## Données personnelles

Seules les informations utiles à la relation commerciale sont demandées (prénom, nom, téléphone, e-mail facultatif, notes). Les clients ne sont visibles que des comptes `customers.view`. Le service worker ne met jamais en cache de page ni de donnée : seulement les fichiers statiques publics.

## Sauvegarde et restauration

- **Supabase** : sauvegardes quotidiennes automatiques sur les offres payantes (*Database → Backups*), restauration en un clic ; l'offre Pro permet la restauration à un instant donné (PITR).
- **Sauvegarde complémentaire (recommandée, hebdomadaire)** sur un poste de confiance :

  ```bash
  pg_dump "postgresql://postgres:<mot-de-passe>@db.<ref>.supabase.co:5432/postgres" \
    --schema=public --schema=auth --format=custom --file=elegance-$(date +%F).dump
  ```

  Conservez les fichiers chiffrés hors du poste de la boutique (ex. disque externe + stockage en ligne).
- **Restauration** dans un projet neuf : appliquez d'abord les migrations, puis
  `pg_restore --data-only --disable-triggers -d "<url>" elegance-AAAA-MM-JJ.dump`
  (les déclencheurs sont désactivés pendant la restauration pour ne pas rejouer les gardes).
- Testez une restauration sur un projet de test au moins une fois par trimestre.
- Photos produits : bucket `product-photos` (téléchargeable depuis *Storage*).
