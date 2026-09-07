import { checkPermission, hasRole, hasAnyRole, PERMISSIONS } from '../lib/permissions';
import type { UserRole, Customer, Order, Payment, Workshop } from '../lib/types';

function runSecurityTests() {
  console.log('==================================================');
  console.log('ATELIERPRO — TESTS AUTOMATISÉS DE SÉCURITÉ & ISOLATION');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. RBAC Hierarchy Tests
  console.log('--- TEST 1: Hiérarchie et Permissions RBAC ---');
  assert(hasRole('OWNER', 'MANAGER'), 'OWNER domine MANAGER');
  assert(hasRole('MANAGER', 'TAILOR'), 'MANAGER domine TAILOR');
  assert(!hasRole('TAILOR', 'MANAGER'), 'TAILOR ne domine pas MANAGER');
  assert(!hasRole('EMPLOYEE', 'CASHIER'), 'EMPLOYEE ne domine pas CASHIER');

  // 2. Financial Permissions Tests (Only OWNER, MANAGER, CASHIER)
  console.log('\n--- TEST 2: Permissions Financières & Encaissement ---');
  const financialRoles: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER'];
  const nonFinancialRoles: UserRole[] = ['TAILOR', 'CUTTER', 'EMPLOYEE'];

  financialRoles.forEach((role) => {
    assert(checkPermission(role, 'CREATE_PAYMENT'), `${role} a le droit de créer un paiement`);
    assert(checkPermission(role, 'VIEW_PAYMENTS'), `${role} a le droit de voir les paiements`);
    assert(checkPermission(role, 'VIEW_FINANCIAL_REPORTS'), `${role} a le droit de voir les rapports financiers`);
  });

  nonFinancialRoles.forEach((role) => {
    assert(!checkPermission(role, 'CREATE_PAYMENT'), `${role} est STRICTEMENT BLOQUÉ pour créer un paiement`);
    assert(!checkPermission(role, 'VIEW_PAYMENTS'), `${role} est STRICTEMENT BLOQUÉ pour voir les paiements`);
    assert(!checkPermission(role, 'VIEW_FINANCIAL_REPORTS'), `${role} est STRICTEMENT BLOQUÉ pour les rapports financiers`);
  });

  // 3. Destructive and Administrative Action Tests
  console.log('\n--- TEST 3: Actions Destructives & Administration Atelier ---');
  assert(checkPermission('OWNER', 'DELETE_WORKSHOP'), 'OWNER peut supprimer l\'atelier');
  assert(!checkPermission('MANAGER', 'DELETE_WORKSHOP'), 'MANAGER NE PEUT PAS supprimer l\'atelier');
  assert(!checkPermission('CASHIER', 'DELETE_WORKSHOP'), 'CASHIER NE PEUT PAS supprimer l\'atelier');
  assert(!checkPermission('TAILOR', 'DELETE_WORKSHOP'), 'TAILOR NE PEUT PAS supprimer l\'atelier');

  assert(checkPermission('OWNER', 'DELETE_PAYMENT'), 'Seul OWNER peut supprimer un paiement');
  assert(!checkPermission('MANAGER', 'DELETE_PAYMENT'), 'MANAGER NE PEUT PAS supprimer un paiement');
  assert(!checkPermission('CASHIER', 'DELETE_PAYMENT'), 'CASHIER NE PEUT PAS supprimer un paiement');

  // 4. Audit Log Access
  console.log('\n--- TEST 4: Accès au Journal d\'Audit Immuable ---');
  assert(checkPermission('OWNER', 'VIEW_AUDIT_LOGS'), 'OWNER a accès aux logs d\'audit');
  assert(checkPermission('MANAGER', 'VIEW_AUDIT_LOGS'), 'MANAGER a accès aux logs d\'audit');
  assert(!checkPermission('CASHIER', 'VIEW_AUDIT_LOGS'), 'CASHIER ne doit PAS voir les logs d\'audit');
  assert(!checkPermission('TAILOR', 'VIEW_AUDIT_LOGS'), 'TAILOR ne doit PAS voir les logs d\'audit');

  // 5. Multi-Tenant Simulation Tests
  console.log('\n--- TEST 5: Simulation d\'Isolation Multi-Tenant ---');
  const workshopA: Workshop = {
    id: 'workshop-aaa-111',
    name: 'Atelier A',
    currency: 'XOF',
    currency_symbol: 'FCFA',
    owner_id: 'user-a-owner',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const workshopB: Workshop = {
    id: 'workshop-bbb-222',
    name: 'Atelier B',
    currency: 'XOF',
    currency_symbol: 'FCFA',
    owner_id: 'user-b-owner',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customerA: Customer = {
    id: 'cust-aaa',
    workshop_id: workshopA.id,
    full_name: 'Client Atelier A',
    phone: '+221770000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customerB: Customer = {
    id: 'cust-bbb',
    workshop_id: workshopB.id,
    full_name: 'Client Atelier B',
    phone: '+221770000002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const orderA: Order = {
    id: 'order-aaa',
    workshop_id: workshopA.id,
    customer_id: customerA.id,
    order_number: 'CMD-2026-0001',
    status: 'NEW',
    priority: 'NORMAL',
    total_amount: 50000,
    paid_amount: 20000,
    balance: 30000,
    order_date: '2026-09-06',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Test cross-tenant customer validation
  function validateOrderCreation(workshop: Workshop, cust: Customer) {
    if (cust.workshop_id !== workshop.id) {
      throw new Error('Violation multi-tenant : client d\'un autre atelier');
    }
    return true;
  }

  let attackBlocked = false;
  try {
    validateOrderCreation(workshopA, customerB);
  } catch (e: any) {
    if (e.message.includes('Violation multi-tenant')) {
      attackBlocked = true;
    }
  }
  assert(attackBlocked, 'Attaque Injection Client Cross-Tenant interceptée et bloquée');

  // Test cross-tenant payment validation
  function validatePaymentCreation(workshop: Workshop, ord: Order, cust: Customer, amount: number) {
    if (ord.workshop_id !== workshop.id) {
      throw new Error('Violation multi-tenant : commande d\'un autre atelier');
    }
    if (ord.customer_id !== cust.id) {
      throw new Error('Violation intégrité : client ne correspond pas à la commande');
    }
    if (amount <= 0) {
      throw new Error('Montant invalide : doit être supérieur à zéro');
    }
    if (amount > ord.balance) {
      throw new Error('Dépassement du solde restant');
    }
    return true;
  }

  let paymentCrossBlocked = false;
  try {
    validatePaymentCreation(workshopB, orderA, customerA, 10000);
  } catch (e: any) {
    if (e.message.includes('Violation multi-tenant')) {
      paymentCrossBlocked = true;
    }
  }
  assert(paymentCrossBlocked, 'Attaque Paiement Cross-Tenant interceptée et bloquée');

  let negativeAmountBlocked = false;
  try {
    validatePaymentCreation(workshopA, orderA, customerA, -5000);
  } catch (e: any) {
    if (e.message.includes('Montant invalide')) {
      negativeAmountBlocked = true;
    }
  }
  assert(negativeAmountBlocked, 'Paiement négatif ou nul strictement rejeté');

  let overpaymentBlocked = false;
  try {
    validatePaymentCreation(workshopA, orderA, customerA, 50000); // balance is 30000
  } catch (e: any) {
    if (e.message.includes('Dépassement')) {
      overpaymentBlocked = true;
    }
  }
  assert(overpaymentBlocked, 'Dépassement de solde bloqué');

  console.log('\n==================================================');
  console.log(`RÉSULTAT : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
