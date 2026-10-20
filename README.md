# Élégance by Aicha

Caisse, stock et gestion commerciale d'une boutique de mode, parfums et accessoires au Sénégal.
Application web installable (PWA), utilisable sur ordinateur, tablette et téléphone.

- **Stack** : Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript strict, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage, RLS), Vercel.
- **Principe** : toutes les opérations commerciales (vente, retour, réception, clôture…) sont des fonctions PostgreSQL transactionnelles et idempotentes ; l'interface n'envoie jamais de prix ni de total, la base les recalcule.
- **Langue et formats** : interface en français, montants en FCFA entiers, dates jj/mm/aaaa à l'heure de Dakar.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local        # renseigner l'URL et les clés Supabase
# appliquer supabase/migrations/*.sql dans l'ordre (voir docs/INSTALLATION.md)
npm run admin:create              # créer la première administratrice (interactif)
npm run dev
```

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Installation locale, configuration Supabase, déploiement Vercel, variables d'environnement |
| [docs/PREMIER-ADMINISTRATEUR.md](docs/PREMIER-ADMINISTRATEUR.md) | Création sécurisée du premier compte gérant |
| [docs/GUIDE-UTILISATION.md](docs/GUIDE-UTILISATION.md) | Guide de la boutique : caisse, retours, stock, achats, clôture, rapports |
| [docs/IMPRESSION.md](docs/IMPRESSION.md) | Tickets thermiques, PDF, étiquettes, lecteurs de codes-barres |
| [docs/CALCULS.md](docs/CALCULS.md) | Définition exacte des indicateurs (CA, encaissements, marge, bénéfice) |
| [docs/SECURITE.md](docs/SECURITE.md) | Rôles, RLS, secrets, sauvegarde et restauration |
| [docs/TESTS.md](docs/TESTS.md) | Lancer les tests et résultats obtenus |
| [docs/ETAT-DU-PROJET.md](docs/ETAT-DU-PROJET.md) | Fonctionnalités terminées, limites et travaux restants |

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run lint`, `npm run typecheck` | Contrôles statiques |
| `npm test` | Tests unitaires (calculs, CSV, codes-barres, périodes, permissions) |
| `npm run test:db` | Tests SQL sur un PostgreSQL local (`npm run db:test:start` d'abord) |
| `npm run test:e2e` | Parcours utilisateur Playwright (application + Supabase de test requis) |
| `npm run stack:up` / `stack:down` | Pile Supabase locale dans Docker pour les tests de bout en bout |
| `npm run admin:create` | Création du premier administrateur |
