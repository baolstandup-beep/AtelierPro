# Plan de Sauvegarde & Procédure de Récupération (Disaster Recovery)

## 1. Vue d'ensemble de l'Architecture AtelierPro
- **Backend & Base de données** : Supabase PostgreSQL (AWS/eu-west-3).
- **Stockage de Médias** : Supabase Storage (`atelierpro-private` et `atelierpro-media`).
- **Frontend & Server Actions** : Next.js 16 hébergé sur Vercel Production.
- **Source de Vérité** : PostgreSQL distant (aucune dépendance à un état client local).

---

## 2. Stratégie de Sauvegarde Base de Données

### A. Sauvegardes Automatiques Managées Supabase
- **Fréquence** : Quotidienne automatique effectuée par l'infrastructure Supabase.
- **Rétention** :
  - Formule standard : 7 jours de snapshots quotidiens.
  - Formule Pro / Enterprise : PITR (Point-In-Time Recovery) à la seconde près jusqu'à 30 jours.
- **Emplacement** : Chiffré au repos (AES-256) sur stockage cloud résilient géographiquement distinct.

### B. Procédure d'Export Manuel (Cold Backup via `pg_dump`)
Pour réaliser une copie locale ou un archivage sécurisé :
```bash
# Export complet du schéma et des données de production
pg_dump "postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --format=custom \
  --file="atelierpro_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Stratégie de Sauvegarde Storage

- **Buckets actifs** :
  - `atelierpro-private` (photos clients, mensurations, modèles sensibles).
  - `atelierpro-media` (éléments visuels publics).
- **Synchronisation hors-site** :
  Utiliser les scripts de synchronisation objet via les APIs S3 compatibles de Supabase :
  ```bash
  aws s3 sync s3://[PROJECT_REF]/atelierpro-private ./backups/storage/private \
    --endpoint-url https://[PROJECT_REF].supabase.co/storage/v1/s3
  ```

---

## 4. Procédure de Reprise d'Activité après Sinistre (Disaster Recovery)

En cas d'incident critique (perte d'instance, corruption de données ou panne régionale) :

1. **Provisionner ou restaurer une instance Supabase** :
   - Depuis le tableau de bord Supabase : `Database -> Backups -> Restore Backup`.
2. **Rejouer les migrations versionnées** :
   - Toutes les structures SQL se trouvent dans le répertoire `supabase/migrations/`.
   - Exécuter séquentiellement :
     - `20260917220130_secure_backend.sql`
     - `20260917_create_storage_bucket.sql`
     - `20260917_fix_registration_triggers.sql`
     - `20260918_phase3_security_admin_audit.sql`
3. **Restaurer les variables d'environnement sur Vercel** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PIN_SECRET` / `PIN_SECRET_V1`
4. **Déploiement et tests de non-régression** :
   - Exécuter la suite de tests automatisée `scratch/test_phase3_security_suite.js`.
   - Valider la persistance et l'isolation locative.
