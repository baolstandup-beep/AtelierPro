# AtelierPro

Application de gestion d'ateliers de couture (clients, mesures, commandes, production, tissus, paiements, dépenses, équipe, rapports) pensée pour l'Afrique francophone. Installable en PWA.

- **Stack** : Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind, Supabase (auth + Postgres + RLS)
- **Paiements** : Wave et Orange Money via Bictorys, Stripe (carte)
- **Production** : https://atelier-pro-rose.vercel.app

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les clés
npm run dev
```

## Variables d'environnement

Voir `.env.example`. Principales :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Opérations serveur (jamais côté client) |
| `NEXT_PUBLIC_APP_URL` | URL de retour des paiements |
| `NEXT_PUBLIC_SITE_URL` | URL canonique (SEO, sitemap) |
| `BICTORYS_*`, `STRIPE_*`, `WHATSAPP_*` | Fournisseurs externes |

## Base de données

Les migrations SQL sont dans `supabase/migrations/` et doivent être appliquées dans l'ordre sur le projet Supabase. `20261006_shared_rate_limits.sql` active la limitation de tentatives partagée entre les instances Vercel ; sans elle, l'application retombe sur un compteur en mémoire par instance.

## Sécurité

- Les pages de l'application sont protégées par `proxy.ts`, mais **pas les routes `/api/*`** : chaque route handler doit vérifier la session (`getAuthenticatedUser()` dans `lib/server-auth.ts`) et résoudre l'atelier côté serveur.
- Les en-têtes de sécurité (CSP comprise) sont définis uniquement dans `next.config.ts`.

## Scripts

- `npm run lint`, `npm run build`
- `scripts/` : suites de tests de sécurité / parcours ; `scripts/dev/` : utilitaires ponctuels de diagnostic du schéma.
