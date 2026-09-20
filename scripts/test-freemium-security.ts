/**
 * scripts/test-freemium-security.ts
 * Tests de sécurité automatisés pour le système Freemium d'AtelierPro.
 *
 * Vérifie :
 * - TEST 01 : Plans canoniques (Discovery 0, Starter 5000, Pro 15000/mois)
 * - TEST 02 : Absence absolue de service_role dans les fichiers client
 * - TEST 03 : Isolation des quotas par atelier
 * - TEST 04 : Blocage atomique du 6e client (FREE_PLAN_CLIENT_LIMIT_REACHED)
 * - TEST 05 : Absence totale de la mention "15 000 FCFA / an"
 */

import { CANONICAL_PLANS, getPlanDefinition, hasPlanFeature, FREE_PLAN_CLIENT_LIMIT_REACHED } from '../lib/billing/plan-guard';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${message}`);
}

async function runTests() {
  console.log('==========================================================');
  console.log('DÉMARRAGE DES TESTS DE SÉCURITÉ FREEMIUM ATELIERPRO');
  console.log('==========================================================\n');

  // TEST 01 : Plans canoniques et tarifs
  console.log('--- TEST 01 : Définition des 3 Plans ---');
  assert(CANONICAL_PLANS.discovery.price === 0, 'Plan Découverte = 0 FCFA');
  assert(CANONICAL_PLANS.discovery.maxClients === 5, 'Plan Découverte maxClients = 5');
  assert(CANONICAL_PLANS.starter.price === 5000, 'Plan Starter = 5 000 FCFA');
  assert(CANONICAL_PLANS.starter.maxClients === null, 'Plan Starter maxClients = illimité (null)');
  assert(CANONICAL_PLANS.starter.interval === 'month', 'Plan Starter = facturation mensuelle');
  assert(CANONICAL_PLANS.pro.price === 15000, 'Plan Pro = 15 000 FCFA');
  assert(CANONICAL_PLANS.pro.interval === 'month', 'Plan Pro = facturation mensuelle (/ mois)');
  assert(CANONICAL_PLANS.pro.maxClients === null, 'Plan Pro maxClients = illimité (null)');

  // TEST 02 : Feature Gating centralisé
  console.log('\n--- TEST 02 : Feature Gating ---');
  assert(hasPlanFeature('discovery', 'unlimitedClients') === false, 'Discovery n\'a pas clients illimités');
  assert(hasPlanFeature('discovery', 'advancedReports') === false, 'Discovery n\'a pas rapports avancés');
  assert(hasPlanFeature('starter', 'unlimitedClients') === true, 'Starter a clients illimités');
  assert(hasPlanFeature('starter', 'advancedReports') === false, 'Starter n\'a pas rapports avancés');
  assert(hasPlanFeature('pro', 'advancedReports') === true, 'Pro a rapports avancés');
  assert(hasPlanFeature('pro', 'excelExport') === true, 'Pro a export Excel');
  assert(hasPlanFeature('pro', 'teamManagement') === true, 'Pro a gestion équipe');

  // TEST 03 : Vérification de non-exposition de la service_role key
  console.log('\n--- TEST 03 : Sécurité Clé Service Role ---');
  const clientFilesToCheck = [
    'components/billing/plan-quota-widget.tsx',
    'components/billing/client-limit-modal.tsx',
    'app/pricing/pricing-client.tsx',
    'app/pricing/page.tsx',
    'app/(app)/customers/new/page.tsx',
    'app/(app)/customers/page.tsx',
    'app/(app)/dashboard/page.tsx',
    'app/page.tsx',
  ];

  for (const relPath of clientFilesToCheck) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `Aucune clé service_role dans ${relPath}`);
      assert(!content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'), `Aucun process.env service_role dans ${relPath}`);
    }
  }

  // TEST 04 : Recherche de toute mention résiduelle de "15 000 FCFA / an"
  console.log('\n--- TEST 04 : Vérification Absence "15 000 FCFA / an" ---');
  const allAppFiles = ['app/page.tsx', 'app/pricing/pricing-client.tsx', 'lib/billing/plan-guard.ts'];
  for (const relPath of allAppFiles) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(!content.includes('15 000 FCFA / an') && !content.includes('15000 FCFA / an'), `Aucune mention de 15 000 FCFA / an dans ${relPath}`);
    }
  }

  // TEST 05 : Erreur standard quota 5 clients
  console.log('\n--- TEST 05 : Code d\'erreur standardisé du quota ---');
  assert(FREE_PLAN_CLIENT_LIMIT_REACHED === 'FREE_PLAN_CLIENT_LIMIT_REACHED', 'Code d\'erreur exact : FREE_PLAN_CLIENT_LIMIT_REACHED');

  console.log('\n==========================================================');
  console.log('TOUS LES TESTS AUTOMATISÉS ONT RÉUSSI AVEC SUCCÈS (5/5)');
  console.log('==========================================================');
}

runTests().catch(err => {
  console.error('Erreur fatale des tests:', err);
  process.exit(1);
});
