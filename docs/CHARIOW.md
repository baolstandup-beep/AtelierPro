# Paiements Chariow

Chariow remplace Bictorys pour les abonnements, derrière un drapeau (`PAYMENT_PROVIDER=chariow` côté serveur, `NEXT_PUBLIC_PAYMENT_PROVIDER=chariow` côté formulaires). Par défaut (`bictorys`) rien ne change.

## Mise en route
1. Appliquer `supabase/migrations/20261011_chariow_provider.sql`.
2. Créer dans Chariow un produit par plan payant (Starter 5 000 XOF, Pro 15 000 XOF, mensuel) puis : `update plans set chariow_product_id='prd_...' where slug='starter';` (idem `pro`).
3. Créer un Pulse (`successful.sale`, `failed.sale`, `abandoned.sale`) vers `https://<domaine>/api/webhooks/chariow` ; copier son secret `whsec_…` dans `CHARIOW_PULSE_SECRET`. Clé API dans `CHARIOW_API_KEY`.
4. Faire un achat test réel depuis le Sénégal : vérifier que Wave / Orange Money sont proposés et les frais. Puis passer les deux variables à `chariow`.

## Fonctionnement
- Checkout : `lib/billing/chariow.ts` → `POST /v1/checkout` ; la référence interne voyage dans `custom_metadata.payment_reference`.
- Pulse : signature HMAC-SHA256 sur le corps brut, idempotence via `webhook_events` (`x-pulse-delivery-id`), activation via `confirm_initial_subscription_payment` (montant ±1, devise XOF).
- Erreurs permanentes → HTTP 200 ; transitoires → 500 (Chariow désactive le Pulse après 5 échecs).

## Limites connues
- Aucun Pulse de remboursement documenté : les remboursements restent manuels.
- Wave / Orange Money ne sont pas cités dans la doc développeur Chariow (dépend du pays/IP de l'acheteur).
- Un e-mail réel est exigé par Chariow ; les comptes AtelierPro utilisent des e-mails internes.
