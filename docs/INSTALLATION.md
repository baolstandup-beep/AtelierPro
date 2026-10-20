# Installation, configuration Supabase et déploiement Vercel

## 1. Prérequis

- Node.js 20.9 ou plus récent, npm.
- Un compte Supabase (offre gratuite suffisante pour démarrer) et un compte Vercel.
- Facultatif pour les tests : PostgreSQL 15+ local, Docker.

## 2. Créer le projet Supabase

1. Sur https://supabase.com : **New project**. Région conseillée : la plus proche du Sénégal disponible (ex. `eu-west` / Europe).
2. Notez le mot de passe de la base dans un gestionnaire de mots de passe.
3. **Authentication → Sign In / Providers** :
   - Laissez **Email** activé.
   - **Désactivez « Allow new users to sign up »** : les comptes sont créés uniquement par la gérante depuis l'application. (Même si l'inscription restait ouverte, un compte inscrit est créé *inactif et sans droits* par le déclencheur `handle_new_user`.)
   - **Authentication → URL Configuration** : *Site URL* = l'URL Vercel (ex. `https://elegance-aicha.vercel.app`) et ajoutez `https://…/auth/callback` dans *Redirect URLs* (réinitialisation du mot de passe).
4. **Authentication → Rate limits** : conservez les limites par défaut (elles complètent la limitation applicative de 5 essais / 15 min par e-mail et adresse IP).

## 3. Appliquer les migrations

Les fichiers de `supabase/migrations/` doivent être exécutés **dans l'ordre** :

| Fichier | Contenu |
| --- | --- |
| `…000100_schema.sql` | Tables, types, contraintes, index |
| `…000200_core_functions.sql` | Permissions, gardes (stock, caisse clôturée, historique non modifiable) |
| `…000300_business_functions.sql` | Ventes, annulations, retours, crédits, caisse, dépenses, stock, inventaires, achats, produits |
| `…000400_reports.sql` | Indicateurs et rapports |
| `…000500_rls.sql` | RLS et privilèges minimaux |
| `…000600_storage.sql` | Bucket `product-photos` et ses politiques |
| `…000700_import.sql` | Import CSV transactionnel |
| `…000800_settings_audit.sql` | Journalisation des réglages |

Deux méthodes :

- **SQL Editor** (simple) : ouvrez chaque fichier, collez, exécutez, dans l'ordre.
- **CLI Supabase** : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.

Vérification : *Database → Tables* doit afficher `products`, `sales`… avec **RLS enabled** sur chacune ; *Storage* doit contenir le bucket `product-photos`.

## 4. Variables d'environnement

Copiez `.env.example` en `.env.local` (local) ou saisissez-les dans Vercel (*Settings → Environment Variables*) :

| Variable | Où la trouver | Exposée au navigateur ? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Oui (sans risque, protégée par la RLS) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Idem, clé *anon / publishable* | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem, clé *service_role / secret* | **Jamais** — serveur uniquement |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application | Oui |

La clé `service_role` sert uniquement côté serveur à créer les comptes des employés, réinitialiser un mot de passe et limiter les tentatives de connexion. Elle n'est importée que par `lib/supabase/admin.ts` (marqué `server-only` : le build échoue si un composant client l'importe).

## 5. Premier administrateur

Voir [PREMIER-ADMINISTRATEUR.md](PREMIER-ADMINISTRATEUR.md).

## 6. Lancer en local

```bash
npm install
npm run dev     # http://localhost:3000
```

## 7. Déployer sur Vercel

1. Poussez le dépôt sur GitHub, puis sur Vercel : **Add New → Project → Import** le dépôt.
2. Framework détecté : Next.js. Laissez les commandes par défaut (`npm run build`).
3. Ajoutez les 4 variables d'environnement (Production **et** Preview si vous utilisez un projet Supabase de test pour les préversions — recommandé).
4. **Deploy**. Reportez l'URL obtenue dans Supabase (*Site URL* et *Redirect URLs*).
5. Ouvrez l'application sur le téléphone de la boutique et utilisez « Ajouter à l'écran d'accueil » pour l'installer.

> Bonne pratique : un projet Supabase **de test** distinct pour les préversions Vercel et les tests de parcours. Ne lancez jamais `npm run test:e2e` contre la production.
