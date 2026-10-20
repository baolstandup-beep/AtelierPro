# Créer le premier administrateur

Aucun compte administrateur ni mot de passe n'est codé en dur dans le projet. Le premier compte est créé par un script, une seule fois.

## Procédure

Sur un ordinateur de confiance (pas un poste partagé), dans le dossier du projet :

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="(clé service_role)" \
npm run admin:create
```

Le script demande l'e-mail, le nom complet et le mot de passe (saisie masquée, 12 caractères minimum), puis :

1. vérifie qu'**aucun administrateur actif n'existe** — sinon il s'arrête ;
2. crée le compte dans Supabase Auth (e-mail confirmé) ;
3. active son profil avec le rôle `admin` ;
4. inscrit l'opération au journal d'activité.

Fermez ensuite le terminal (la clé ne doit pas rester dans l'historique : préfixez la commande d'une espace si votre shell l'exclut de l'historique, ou utilisez un fichier `.env.local` que vous supprimez après).

## Ensuite

- Connectez-vous sur l'application avec ce compte.
- **Réglages** : nom, adresse, téléphone, mentions (NINEA/RCCM) et message du ticket ; plafond de remise des caissiers.
- **Utilisateurs** : créez les comptes caissiers / gestionnaires de stock avec un mot de passe provisoire remis en main propre ; chacun le change dans **Mon compte**.
- Créez un **second administrateur** de secours : l'application interdit de supprimer ou rétrograder le dernier administrateur actif, et personne ne peut modifier ses propres droits.

## En cas de perte du seul compte administrateur

Dans Supabase (SQL Editor), en tant que propriétaire du projet :

```sql
update public.profiles set role = 'admin', is_active = true where email = 'adresse@exemple.sn';
```

puis réinitialisez son mot de passe depuis *Authentication → Users*.
