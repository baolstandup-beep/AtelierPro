/**
 * scripts/test-subscription-lifecycle.ts
 * Banc de validation exhaustif pour le réabonnement et le changement de formule
 * SANS JAMAIS recréer de compte Supabase ni d'atelier.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import {
  initRenewalPayment,
  confirmSubscriptionPaymentTransaction,
} from '../lib/billing/payment-service';
import { getSubscriptionAccess, getAtelierClientQuota } from '../lib/billing/subscription-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function runSubscriptionLifecycleTests() {
  console.log('================================================================');
  console.log('ATELIERPRO — TESTS DU CYCLE DE VIE DES ABONNEMENTS SANS RECRÉATION');
  console.log('================================================================\n');

  let passed = 0;
  let totalTests = 10;

  // Récupérer les 3 plans
  const { data: plans } = await supabase.from('plans').select('*');
  const discoveryPlan = plans?.find((p) => p.slug === 'discovery');
  const starterPlan = plans?.find((p) => p.slug === 'starter');
  const proPlan = plans?.find((p) => p.slug === 'pro');

  if (!discoveryPlan || !starterPlan || !proPlan) {
    console.error('❌ Erreur : Impossible de charger les 3 plans Découverte, Starter, Pro');
    process.exit(1);
  }

  // ─── CRÉATION D'UN UTILISATEUR ET D'UN ATELIER UNIQUE ───────────────────────
  const testEmail = `lifecycle.test.${Date.now()}@atelierpro.dev`;
  const testPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'Password123!@#',
    phone: testPhone,
    email_confirm: true,
    phone_confirm: true,
  });

  if (authErr || !authData.user) {
    console.error('❌ Impossible de créer l\'utilisateur de test auth:', authErr);
    process.exit(1);
  }

  const persistentUserId = authData.user.id;

  // Attendre un bref instant que le trigger auth crée le profil et l'atelier
  await new Promise((r) => setTimeout(r, 600));

  // Récupérer le profil et l'atelier créés canoniquement
  const { data: initialProfile } = await supabase
    .from('profiles')
    .select('id, atelier_id')
    .eq('id', persistentUserId)
    .single();

  let persistentAtelierId = initialProfile?.atelier_id;

  if (!persistentAtelierId) {
    const { data: workshop } = await supabase
      .from('ateliers')
      .insert({
        name: 'Atelier Test Cycle Permanent',
        currency: 'XOF',
        phone: testPhone,
      })
      .select('id')
      .single();
    persistentAtelierId = workshop!.id;
    await supabase.from('profiles').upsert({
      id: persistentUserId,
      atelier_id: persistentAtelierId,
      full_name: 'Babacar Ndiaye',
      phone: testPhone,
      role: 'owner',
    });
  }

  // Créer l'abonnement initial Découverte
  const { data: initialSub, error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      atelier_id: persistentAtelierId,
      plan_id: discoveryPlan.id,
      status: 'active',
      started_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: null, // Gratuit permanent
    })
    .select('id')
    .single();

  if (subErr || !initialSub) {
    console.error('❌ Impossible d\'insérer la subscription initiale:', subErr);
    process.exit(1);
  }

  const persistentSubId = initialSub.id;

  try {
    // ─── TEST 1 : Vérification de l'état initial Découverte ─────────────────
    console.log('--- TEST 01 : État initial — Formule Découverte (0 FCFA) ---');
    const access1 = await getSubscriptionAccess(persistentAtelierId);
    if (
      access1.level === 'ACTIVE' &&
      access1.subscription?.plan?.slug === 'discovery' &&
      access1.subscription?.atelier_id === persistentAtelierId
    ) {
      console.log('✅ TEST 1 PASS : Formule Découverte active sans expiration');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED:', access1);
    }

    // ─── TEST 2 : Création de 5 clients sur Découverte ──────────────────────
    console.log('\n--- TEST 02 : Création de 5 clients sous le quota Découverte ---');
    for (let i = 1; i <= 5; i++) {
      await supabase.from('clients').insert({
        atelier_id: persistentAtelierId,
        name: `Client Découverte ${i}`,
        phone: `+22177000000${i}`,
        gender: 'homme',
      });
    }
    const quota2 = await getAtelierClientQuota(persistentAtelierId);
    if (quota2.clientCount === 5 && quota2.isLimitReached && !quota2.canCreate) {
      console.log('✅ TEST 2 PASS : Exactement 5 clients créés, limite atteinte');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED:', quota2);
    }

    // ─── TEST 3 : Blocage du 6ème client en Découverte ──────────────────────
    console.log('\n--- TEST 03 : Tentative 6ème client en Découverte (doit être bloqué) ---');
    const { error: blockErr } = await supabase.from('clients').insert({
      atelier_id: persistentAtelierId,
      name: 'Client 6 Illégal',
      gender: 'homme',
    });
    if (blockErr && blockErr.message.includes('FREE_PLAN_CLIENT_LIMIT_REACHED')) {
      console.log('✅ TEST 3 PASS : Le 6ème client est bloqué par la base de données');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED : L\'insertion aurait dû échouer. Erreur reçue:', blockErr);
    }

    // ─── TEST 4 : Découverte -> Starter (Upgrade sans recréer de compte) ───
    console.log('\n--- TEST 04 : Changement de formule Découverte -> Starter ---');
    const initStarter = await initRenewalPayment(persistentAtelierId, persistentSubId, starterPlan.id, 'WAVE');
    if (!initStarter.success || !initStarter.payment_reference) {
      throw new Error(`Init payment starter failed: ${initStarter.error}`);
    }

    const confirmStarter = await confirmSubscriptionPaymentTransaction(
      initStarter.payment_reference,
      'WAVE',
      Number(starterPlan.price)
    );

    const access4 = await getSubscriptionAccess(persistentAtelierId);
    const quota4 = await getAtelierClientQuota(persistentAtelierId);

    if (
      confirmStarter.success &&
      access4.level === 'ACTIVE' &&
      access4.subscription?.plan?.slug === 'starter' &&
      access4.subscription?.atelier_id === persistentAtelierId &&
      quota4.clientCount === 5 && // DONNÉES INTACTES !
      quota4.canCreate // Starter autorise l'ajout
    ) {
      console.log('✅ TEST 4 PASS : Découverte -> Starter réussi, atelier inchangé, 5 clients intacts');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED:', { confirmStarter, access4, quota4 });
    }

    // ─── TEST 5 : Ajout du 6ème client débloqué par Starter ─────────────────
    console.log('\n--- TEST 05 : Ajout du 6ème client désormais autorisé sous Starter ---');
    const { error: c6Err } = await supabase.from('clients').insert({
      atelier_id: persistentAtelierId,
      name: 'Client 6 Débloqué',
      gender: 'femme',
    });
    const quota5 = await getAtelierClientQuota(persistentAtelierId);
    if (!c6Err && quota5.clientCount === 6) {
      console.log('✅ TEST 5 PASS : 6ème client créé avec succès sous Starter');
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED:', c6Err, quota5);
    }

    // ─── TEST 6 : Starter -> Pro (Upgrade avec prise d'effet immédiate) ─────
    console.log('\n--- TEST 06 : Upgrade Starter -> Pro (Déblocage fonctionnalités Pro) ---');
    const initPro = await initRenewalPayment(persistentAtelierId, persistentSubId, proPlan.id, 'ORANGE_MONEY');
    if (!initPro.success || !initPro.payment_reference) {
      throw new Error(`Init payment pro failed: ${initPro.error}`);
    }

    const confirmPro = await confirmSubscriptionPaymentTransaction(
      initPro.payment_reference,
      'ORANGE_MONEY',
      Number(proPlan.price)
    );

    const access6 = await getSubscriptionAccess(persistentAtelierId);
    if (
      confirmPro.success &&
      access6.level === 'ACTIVE' &&
      access6.subscription?.plan?.slug === 'pro' &&
      access6.subscription?.atelier_id === persistentAtelierId
    ) {
      console.log('✅ TEST 6 PASS : Upgrade vers Pro effectif, atelier & données conservés');
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED:', { confirmPro, access6 });
    }

    // ─── TEST 7 : Pro -> Pro (Renouvellement anticipé conservant la période) 
    console.log('\n--- TEST 07 : Renouvellement Pro -> Pro (Période cumulée) ---');
    const previousEnd = new Date(access6.subscription!.current_period_end!).getTime();

    const initRenew = await initRenewalPayment(persistentAtelierId, persistentSubId, proPlan.id, 'WAVE');
    await confirmSubscriptionPaymentTransaction(
      initRenew.payment_reference!,
      'WAVE',
      Number(proPlan.price)
    );

    const access7 = await getSubscriptionAccess(persistentAtelierId);
    const newEnd = new Date(access7.subscription!.current_period_end!).getTime();

    if (newEnd > previousEnd && access7.subscription?.plan?.slug === 'pro') {
      console.log('✅ TEST 7 PASS : Renouvellement anticipé prolonge la date de fin existante');
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED:', { previousEnd, newEnd });
    }

    // ─── TEST 8 : Simulation abonnement expiré (Compte & données conservés) ─
    console.log('\n--- TEST 08 : Expiration de l\'abonnement (Données conservées en lecture) ---');
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('subscriptions')
      .update({
        current_period_end: pastDate,
        status: 'expired',
      })
      .eq('atelier_id', persistentAtelierId);

    const access8 = await getSubscriptionAccess(persistentAtelierId);
    const { count: clientsCount8 } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('atelier_id', persistentAtelierId);

    if (
      access8.level === 'READ_ONLY' &&
      clientsCount8 === 6 // TOUS LES 6 CLIENTS SONT LÀ !
    ) {
      console.log('✅ TEST 8 PASS : Abonnement expiré détecté, 6 clients conservés sans altération');
      passed++;
    } else {
      console.error('❌ TEST 8 FAILED:', { access8, clientsCount8 });
    }

    // ─── TEST 9 : Réactivation Pro expiré -> Starter (Changement après expiration)
    console.log('\n--- TEST 09 : Réactivation d\'un abonnement expiré vers Starter ---');
    const initReactivate = await initRenewalPayment(persistentAtelierId, persistentSubId, starterPlan.id, 'WAVE');
    await confirmSubscriptionPaymentTransaction(
      initReactivate.payment_reference!,
      'WAVE',
      Number(starterPlan.price)
    );

    const access9 = await getSubscriptionAccess(persistentAtelierId);
    if (
      access9.level === 'ACTIVE' &&
      access9.subscription?.plan?.slug === 'starter' &&
      new Date(access9.subscription!.current_period_end!) > new Date()
    ) {
      console.log('✅ TEST 9 PASS : Réactivation immédiate sur Starter, nouveau cycle démarré');
      passed++;
    } else {
      console.error('❌ TEST 9 FAILED:', access9);
    }

    // ─── TEST 10 : VÉRIFICATION CRITIQUE FINALE DE PERMANENCE ────────────────
    console.log('\n--- TEST 10 : Test Critique — Vérification stricte des identifiants permanents ---');
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('id, atelier_id')
      .eq('id', persistentUserId)
      .single();

    const { data: finalSub } = await supabase
      .from('subscriptions')
      .select('id, atelier_id')
      .eq('atelier_id', persistentAtelierId)
      .single();

    const { count: finalClientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('atelier_id', persistentAtelierId);

    const userMatch = finalProfile?.id === persistentUserId;
    const atelierMatch = finalProfile?.atelier_id === persistentAtelierId && finalSub?.atelier_id === persistentAtelierId;
    const dataMatch = finalClientsCount === 6;

    console.log('DEBUG TEST 10:', {
      persistentUserId,
      persistentAtelierId,
      finalProfile,
      finalSub,
      finalClientsCount,
    });

    if (userMatch && atelierMatch && dataMatch) {
      console.log('✅ TEST 10 PASS : Permanence absolue confirmée !');
      console.log(`   User ID    : ${persistentUserId} (INCHANGÉ)`);
      console.log(`   Atelier ID : ${persistentAtelierId} (INCHANGÉ)`);
      console.log(`   Clients    : ${finalClientsCount} clients (INTACTS)`);
      passed++;
    } else {
      console.error('❌ TEST 10 FAILED : Altération détectée !', { userMatch, atelierMatch, dataMatch });
    }

  } finally {
    // Nettoyage des données de test
    console.log('\n--- Nettoyage sécurisé des données de test ---');
    await supabase.from('clients').delete().eq('atelier_id', persistentAtelierId);
    await supabase.from('subscription_payments').delete().eq('atelier_id', persistentAtelierId);
    await supabase.from('subscriptions').delete().eq('atelier_id', persistentAtelierId);
    await supabase.from('profiles').delete().eq('id', persistentUserId);
    await supabase.from('ateliers').delete().eq('id', persistentAtelierId);
    await supabase.auth.admin.deleteUser(persistentUserId);
    console.log('🧹 Nettoyage terminé.');
  }

  console.log('\n================================================================');
  console.log(`RÉSULTAT GLOBAL : ${passed}/${totalTests} TESTS PASSÉS AVEC SUCCÈS`);
  console.log('================================================================\n');

  if (passed === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSubscriptionLifecycleTests().catch((err) => {
  console.error('FATAL ERROR IN TESTS:', err);
  process.exit(1);
});
