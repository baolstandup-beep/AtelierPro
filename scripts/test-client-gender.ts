import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runTests() {
  console.log('================================================================');
  console.log('ATELIERPRO — VALIDATION TESTS CLIENT GENDER & QUOTA');
  console.log('================================================================');

  // Trouver un atelier actif
  const { data: atelier, error: atErr } = await supabase
    .from('ateliers')
    .select('id, name')
    .limit(1)
    .single();

  if (atErr || !atelier) {
    console.error('Impossible de trouver un atelier:', atErr?.message);
    process.exit(1);
  }

  const atelierId = atelier.id;
  console.log(`Atelier de test: ${atelier.name} (${atelierId})\n`);

  const createdClientIds: string[] = [];

  try {
    // ─── TEST 1 : Nom = PAPE, Genre = 'Homme' (doit être normalisé en 'homme') ───
    console.log('--- TEST 1 : Nom: PAPE, Genre: Homme ---');
    const rawGender1 = 'Homme';
    const safeGender1 =
      rawGender1.trim().toLowerCase() === 'homme' || rawGender1.trim().toLowerCase() === 'male'
        ? 'homme'
        : null;

    const payload1 = {
      atelier_id: atelierId,
      name: 'PAPE',
      phone: '+221773033196',
      gender: safeGender1,
      notes: 'Test Client Pape',
    };

    console.log('CLIENT PAYLOAD 1:', payload1);

    const { data: client1, error: err1 } = await supabase
      .from('clients')
      .insert(payload1)
      .select()
      .single();

    if (err1) {
      console.error('CREATE CLIENT FAILED', {
        code: err1.code,
        message: err1.message,
        details: err1.details,
        hint: err1.hint,
      });
      throw new Error(`TEST 1 FAILED: ${err1.message}`);
    }

    createdClientIds.push(client1.id);
    if (client1.gender === 'homme') {
      console.log('✅ TEST 1 PASS : Client créé avec succès, gender = "homme" (ID:', client1.id, ')');
    } else {
      throw new Error(`TEST 1 FAILED: gender attendu "homme", reçu "${client1.gender}"`);
    }

    // ─── TEST 2 : Genre = 'Femme' (doit être normalisé en 'femme') ─────────────
    console.log('\n--- TEST 2 : Genre: Femme ---');
    const rawGender2 = 'Femme';
    const safeGender2 =
      rawGender2.trim().toLowerCase() === 'femme' || rawGender2.trim().toLowerCase() === 'female'
        ? 'femme'
        : null;

    const payload2 = {
      atelier_id: atelierId,
      name: 'Aminata Sow',
      phone: '+221778901234',
      gender: safeGender2,
    };

    console.log('CLIENT PAYLOAD 2:', payload2);

    const { data: client2, error: err2 } = await supabase
      .from('clients')
      .insert(payload2)
      .select()
      .single();

    if (err2) {
      console.error('CREATE CLIENT FAILED', {
        code: err2.code,
        message: err2.message,
        details: err2.details,
        hint: err2.hint,
      });
      throw new Error(`TEST 2 FAILED: ${err2.message}`);
    }

    createdClientIds.push(client2.id);
    if (client2.gender === 'femme') {
      console.log('✅ TEST 2 PASS : Client créé avec succès, gender = "femme" (ID:', client2.id, ')');
    } else {
      throw new Error(`TEST 2 FAILED: gender attendu "femme", reçu "${client2.gender}"`);
    }

    // ─── TEST 3 : Pas de genre (champ facultatif -> null) ─────────────────────
    console.log('\n--- TEST 3 : Pas de genre (null) ---');
    const payload3 = {
      atelier_id: atelierId,
      name: 'Client Sans Genre',
      phone: '+221771122334',
      gender: null,
    };

    console.log('CLIENT PAYLOAD 3:', payload3);

    const { data: client3, error: err3 } = await supabase
      .from('clients')
      .insert(payload3)
      .select()
      .single();

    if (err3) {
      console.error('CREATE CLIENT FAILED', {
        code: err3.code,
        message: err3.message,
        details: err3.details,
        hint: err3.hint,
      });
      throw new Error(`TEST 3 FAILED: ${err3.message}`);
    }

    createdClientIds.push(client3.id);
    if (client3.gender === null) {
      console.log('✅ TEST 3 PASS : Client créé avec succès, gender = null sans erreur clients_gender_check');
    } else {
      throw new Error(`TEST 3 FAILED: gender attendu null, reçu "${client3.gender}"`);
    }

    // ─── TEST 4 : Vérification de la présence dans la liste des clients ────────
    console.log('\n--- TEST 4 : Apparition immédiate dans la liste des clients ---');
    const { data: clientList, error: listErr } = await supabase
      .from('clients')
      .select('id, name, gender')
      .eq('atelier_id', atelierId)
      .in('id', createdClientIds);

    if (listErr || !clientList || clientList.length !== 3) {
      throw new Error(`TEST 4 FAILED: Liste clients incomplète (${clientList?.length}/3 trouvés)`);
    }

    console.log('✅ TEST 4 PASS : Les 3 clients apparaissent immédiatement en base :', clientList);

    console.log('\n================================================================');
    console.log('RÉSULTAT : TOUS LES 4 TESTS DE GENRE SONT VALIDÉS AVEC SUCCÈS !');
    console.log('================================================================\n');

  } finally {
    // Nettoyage des clients de test
    if (createdClientIds.length > 0) {
      await supabase.from('clients').delete().in('id', createdClientIds);
      console.log(`🧹 Nettoyage : ${createdClientIds.length} clients de test supprimés.`);
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Échec d’un test:', err);
  process.exit(1);
});
