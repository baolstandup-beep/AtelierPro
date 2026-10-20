# Tests

## Niveaux

| Commande | Ce qui est testé | Environnement |
| --- | --- | --- |
| `npm test` | Calculs (marge, remise répartie, paiement mixte, monnaie, retours, écarts), formats FCFA/dates, CSV, import produits, codes-barres (AZERTY, EAN), périodes, cohérence des permissions TypeScript ↔ SQL | Node seul |
| `npm run test:db` | Migrations réelles + fonctions SQL + RLS, rôle par rôle, sur PostgreSQL (environnement Supabase simulé : rôles `anon` / `authenticated` / `service_role`, `auth.uid()`, privilèges par défaut identiques) | PostgreSQL 15+ local (`npm run db:test:start`) |
| `npm run test:e2e` | Parcours utilisateur dans Chromium sur l'application construite : produit, caissier, caisse, scan clavier, paiement mixte, ticket, stock, retour, clôture, rapports, export CSV, droits du caissier, affichage mobile | Application + Supabase de test (`npm run stack:up`, puis `npm run build && npm start`) |

Variables pour les parcours : `E2E_BASE_URL` (défaut `http://localhost:3000`), `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, éventuellement `PLAYWRIGHT_CHROMIUM_PATH`.

```bash
npm run stack:up                         # Docker requis
set -a; source .env.stack; set +a
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY \
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY npm run build && npm start &
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
ADMIN_EMAIL=aicha@elegance.test ADMIN_NAME="Aicha" ADMIN_PASSWORD='MotDePasse-Test-2026' npm run admin:create
E2E_ADMIN_PASSWORD='MotDePasse-Test-2026' npm run test:e2e
```

## Couverture des exigences

| Exigence | Test(s) |
| --- | --- |
| Connexion et permissions | `tests/db/security.test.ts` (12 cas), parcours « caissier ne peut pas administrer » |
| Création de produits et variantes | `purchases-stock.test.ts`, parcours « produit à deux variantes » |
| Unicité des codes-barres | `purchases-stock.test.ts`, `import-settings.test.ts`, `barcode-csv.test.ts` |
| Vente multi-articles | `sales.test.ts` |
| Paiement mixte | `sales.test.ts`, `calc.test.ts`, parcours caisse |
| Déduction du stock (une seule fois) | `sales.test.ts` (requête rejouée et requêtes simultanées), parcours |
| Refus de stock insuffisant | `sales.test.ts` (rien n'est enregistré) |
| Retour partiel / remboursement / avoir | `returns.test.ts` (9 cas), parcours |
| Réception de marchandises | `purchases-stock.test.ts` (partielle, rejouée, sur-réception refusée) |
| Ouverture et clôture de caisse | `cash-reports.test.ts`, parcours |
| Calcul des marges | `cash-reports.test.ts` (5 000 → 8 000 = 3 000), `calc.test.ts` |
| Isolation des données entre utilisateurs | `security.test.ts` (un caissier ne voit que ses ventes ; stock manager sans clients), parcours |
| Prévention des doubles opérations | ventes, retours, réceptions, règlements |
| Affichage responsive | `tests/e2e/responsive.spec.ts` (Pixel 7, absence de défilement horizontal) |

## Résultats (20/10/2026)

- Lint : 0 erreur, 0 avertissement. TypeScript strict : 0 erreur. `next build` : réussi (42 routes).
- `npm test` + `npm run test:db` : **71 tests réussis** (10 fichiers).
- `npm run test:e2e` : **10 parcours réussis** (8 ordinateur, 2 mobile) sur une pile Supabase locale (Postgres Supabase 15.8, GoTrue 2.177, PostgREST 12.2) — les migrations y sont appliquées avec le rôle `postgres` non superutilisateur, comme dans le SQL Editor Supabase.
- Non couvert automatiquement : envoi de photo (Storage absent de la pile locale), caméra, impression physique.
