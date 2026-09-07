import { useAppStore } from '../lib/store';
import { generateOrderNumber } from '../lib/utils';
import type { OrderStatus } from '../lib/types';

async function runMvpFlowTest() {
  console.log('===============================================================');
  console.log('ATELIERPRO — TEST D\'INTÉGRATION DU PARCOURS COMPLET MVP CRITIQUE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, stepName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [SUCCÈS] ${stepName}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [ÉCHEC] ${stepName}${detail ? ` — ERREUR: ${detail}` : ''}`);
      failed++;
    }
  }

  const store = useAppStore.getState();

  // -------------------------------------------------------------
  // ÉTAPE 1 : Inscription utilisateur
  // -------------------------------------------------------------
  console.log('--- ÉTAPE 1 : Inscription Utilisateur ---');
  store.signIn('mamadou@atelierpro.sn', 'Mamadou Diallo');
  const userState = useAppStore.getState();
  assert(userState.isAuthenticated, 'Utilisateur authentifié');
  assert(userState.currentUserName === 'Mamadou Diallo', 'Nom utilisateur sauvegardé', userState.currentUserName);
  assert(userState.currentUserRole === 'OWNER', 'Rôle initial OWNER');

  // -------------------------------------------------------------
  // ÉTAPE 2 : Création de l\'atelier (Onboarding 8 étapes)
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 2 : Création de l\'Atelier ---');
  await store.completeOnboarding({
    name: 'Maison Diallo Couture Dakar',
    phone: '+221 77 123 45 67',
    address: 'Rue 10 x Corniche Ouest, Médina',
    city: 'Dakar',
    currency: 'XOF',
    currency_symbol: 'FCFA',
  });
  const wsState = useAppStore.getState();
  assert(wsState.isOnboardingDone, 'Onboarding complété');
  assert(wsState.currentWorkshop !== null, 'Atelier créé');
  assert(wsState.currentWorkshop?.name === 'Maison Diallo Couture Dakar', 'Nom de l\'atelier vérifié');
  assert(wsState.currentWorkshop?.currency_symbol === 'FCFA', 'Devise par défaut FCFA');

  // -------------------------------------------------------------
  // ÉTAPE 3 : Création d\'un client
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 3 : Création d\'un Client ---');
  const customer = await store.createCustomer({
    full_name: 'Fallou Ndiaye',
    phone: '+221 77 555 12 34',
    email: 'fallou.ndiaye@gmail.com',
    address: 'Point E, Dakar',
    city: 'Dakar',
    gender: 'MALE',
    notes: 'Client VIP — préfère les finitions brodées main',
  });
  assert(!!customer.id, 'Client créé avec ID unique', customer.id);
  assert(customer.full_name === 'Fallou Ndiaye', 'Nom du client validé');
  assert(customer.workshop_id === wsState.currentWorkshop?.id, 'Client rattaché au workshop_id');

  // -------------------------------------------------------------
  // ÉTAPE 4 : Enregistrement des mesures
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 4 : Enregistrement des Mesures ---');
  const measurementTypes = useAppStore.getState().measurementTypes;
  assert(measurementTypes.length >= 10, 'Types de mesures par défaut disponibles', `${measurementTypes.length} types`);

  const neckType = measurementTypes.find((t) => t.name.toLowerCase().includes('cou')) || measurementTypes[0];
  const chestType = measurementTypes.find((t) => t.name.toLowerCase().includes('poitrine')) || measurementTypes[1];
  const boubouType = measurementTypes.find((t) => t.name.toLowerCase().includes('boubou')) || measurementTypes[2];

  const profile = await store.createMeasurementProfile({
    customer_id: customer.id,
    label: 'Prise de mesures Tabaski 2026',
    notes: 'Mesures ajustées pour Grand Boubou 3 pièces',
    values: [
      { measurement_type_id: neckType.id, value: 42, unit: 'cm' },
      { measurement_type_id: chestType.id, value: 104, unit: 'cm' },
      { measurement_type_id: boubouType.id, value: 145, unit: 'cm' },
    ],
  });
  assert(!!profile.id, 'Profil de mesures créé', profile.id);
  assert(profile.values?.length === 3, '3 valeurs de mesures enregistrées');
  assert(profile.customer_id === customer.id, 'Mesures rattachées au client Fallou');

  // -------------------------------------------------------------
  // ÉTAPE 5 : Création de commande avec articles & prix
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 5 : Création de Commande avec Articles ---');
  const totalPrice = 75000;
  const advancePayment = 25000;

  const order = await store.createOrder({
    customer_id: customer.id,
    priority: 'HIGH',
    due_date: '2026-09-20',
    notes: 'Tissu Bazin riche Getzner fourni par le client. Broderie fil d\'or.',
    items: [
      {
        name: 'Grand Boubou 3 pièces',
        garment_type: 'BOUBOU',
        fabric: 'Bazin Riche Getzner',
        color: 'Bleu Royal',
        quantity: 1,
        unit_price: 55000,
        notes: 'Col brodé motif royal',
      },
      {
        name: 'Pantalon assorti',
        garment_type: 'PANTALON',
        fabric: 'Bazin Riche Getzner',
        color: 'Bleu Royal',
        quantity: 1,
        unit_price: 20000,
      },
    ],
    initial_payment: advancePayment,
    initial_payment_method: 'WAVE',
  });

  assert(!!order.id, 'Commande créée', order.id);
  assert(order.order_number.startsWith('CMD-'), 'Format numéro auto CMD-YYYY-XXXXX', order.order_number);
  assert(order.total_amount === totalPrice, 'Montant total calculé côté serveur', `${order.total_amount} FCFA`);
  assert(order.paid_amount === advancePayment, 'Avance initiale Wave enregistrée', `${order.paid_amount} FCFA`);
  assert(order.balance === totalPrice - advancePayment, 'Solde restant recalculé correctement', `${order.balance} FCFA`);
  assert(order.items?.length === 2, '2 articles de confection enregistrés');

  // -------------------------------------------------------------
  // ÉTAPE 6 : Suivi de Production (Cycle Kanban de fabrication)
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 6 : Suivi du Cycle de Fabrication (Kanban) ---');
  const productionSteps: OrderStatus[] = [
    'MEASURED',
    'CUTTING',
    'SEWING',
    'FINISHING',
    'READY',
  ];

  for (const step of productionSteps) {
    await store.changeOrderStatus(order.id, step, `Passage à l'étape ${step}`);
    const updatedOrder = store.getOrder(order.id);
    assert(updatedOrder?.status === step, `Statut mis à jour -> ${step}`);
  }

  const finalReadyOrder = store.getOrder(order.id);
  assert(
    !!finalReadyOrder,
    'Commande en statut READY retrouvée'
  );

  // -------------------------------------------------------------
  // ÉTAPE 7 : Encaissement du Solde Final
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 7 : Encaissement du Solde à la Livraison ---');
  const remainingBalance = finalReadyOrder?.balance || 0;
  assert(remainingBalance === 50000, 'Solde à encaisser vérifié', `${remainingBalance} FCFA`);

  const finalPayment = await store.createPayment({
    order_id: order.id,
    customer_id: customer.id,
    amount: remainingBalance,
    method: 'CASH',
    reference: 'RECU-FINAL-001',
    notes: 'Paiement en espèces du solde au retrait',
    payment_date: '2026-09-20',
  });

  assert(!!finalPayment.id, 'Paiement du solde enregistré', finalPayment.id);

  const orderAfterPayment = store.getOrder(order.id);
  assert(orderAfterPayment?.paid_amount === totalPrice, 'Total payé égal au montant total', `${orderAfterPayment?.paid_amount} FCFA`);
  assert(orderAfterPayment?.balance === 0, 'Solde restant strictement à 0 FCFA', `${orderAfterPayment?.balance} FCFA`);

  // -------------------------------------------------------------
  // ÉTAPE 8 : Livraison de la commande
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 8 : Clôture et Livraison ---');
  await store.changeOrderStatus(order.id, 'DELIVERED', 'Commande remise en main propre au client Fallou Ndiaye');
  const deliveredOrder = store.getOrder(order.id);
  assert(deliveredOrder?.status === 'DELIVERED', 'Commande marquée LIVRÉE (DELIVERED)');

  // -------------------------------------------------------------
  // ÉTAPE 9 : Historique & Audit Tracé
  // -------------------------------------------------------------
  console.log('\n--- ÉTAPE 9 : Vérification de l\'Historique et du Journal d\'Audit ---');
  const customerOrders = store.getCustomerOrders(customer.id);
  assert(customerOrders.length === 1, 'Commande retrouvée dans le profil du client');

  const customerMeasurements = store.getMeasurementProfiles(customer.id);
  assert(customerMeasurements.length === 1, 'Mesures archivées retrouvées');

  const customerPayments = store.getOrderPayments(order.id);
  assert(customerPayments.length === 2, 'Les 2 paiements (Avance Wave + Solde Cash) retrouvés');

  console.log('\n===============================================================');
  console.log(`RÉSULTAT GLOBAL DU TEST MVP : ${passed} RÉUSSIS, ${failed} ÉCHECS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMvpFlowTest().catch((err) => {
  console.error('Erreur inattendue durant le test du parcours MVP:', err);
  process.exit(1);
});
