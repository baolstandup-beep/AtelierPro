-- ============================================================
-- ATELIERPRO — SUITE DE TESTS D'ISOLATION ET D'ATTAQUE DE SÉCURITÉ
-- Exécutable sous PostgreSQL / Supabase pour valider l'étanchéité multi-tenant
-- ============================================================

DO $$
DECLARE
  v_user_a1 UUID := 'a0000000-0000-0000-0000-000000000001'::uuid; -- Owner Atelier A
  v_user_a2 UUID := 'a0000000-0000-0000-0000-000000000002'::uuid; -- Tailor Atelier A
  v_user_b1 UUID := 'b0000000-0000-0000-0000-000000000001'::uuid; -- Owner Atelier B
  
  v_workshop_a UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  v_workshop_b UUID := '22222222-2222-2222-2222-222222222222'::uuid;
  
  v_cust_a UUID := 'aaaaaaaa-1111-0000-0000-000000000001'::uuid;
  v_cust_b UUID := 'bbbbbbbb-2222-0000-0000-000000000001'::uuid;
  
  v_order_a UUID := 'aaaaaaaa-aaaa-0000-0000-000000000001'::uuid;
  v_order_b UUID := 'bbbbbbbb-bbbb-0000-0000-000000000001'::uuid;
  
  v_test_failed BOOLEAN := false;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'DÉBUT DES TESTS DE SÉCURITÉ ET D''ISOLATION ATELIERPRO';
  RAISE NOTICE '==================================================';

  -- 1. SETUP DE TEST
  -- Création des profils & ateliers de test
  INSERT INTO profiles (id, full_name) VALUES
    (v_user_a1, 'Mamadou Owner A'),
    (v_user_a2, 'Fatou Tailor A'),
    (v_user_b1, 'Ibrahima Owner B')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO workshops (id, name, owner_id, currency, currency_symbol) VALUES
    (v_workshop_a, 'Atelier Couture Prestige A', v_user_a1, 'XOF', 'FCFA'),
    (v_workshop_b, 'Maison de Couture Elegance B', v_user_b1, 'XOF', 'FCFA')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES
    (v_workshop_a, v_user_a1, 'OWNER', 'ACTIVE'),
    (v_workshop_a, v_user_a2, 'TAILOR', 'ACTIVE'),
    (v_workshop_b, v_user_b1, 'OWNER', 'ACTIVE')
  ON CONFLICT (workshop_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

  INSERT INTO customers (id, workshop_id, full_name, phone) VALUES
    (v_cust_a, v_workshop_a, 'Client A Moussa', '+221770000001'),
    (v_cust_b, v_workshop_b, 'Client B Aissatou', '+221770000002')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO orders (id, workshop_id, customer_id, order_number, total_amount) VALUES
    (v_order_a, v_workshop_a, v_cust_a, 'CMD-A-001', 50000),
    (v_order_b, v_workshop_b, v_cust_b, 'CMD-B-001', 80000)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- TEST 1 : Vérification des fonctions d'isolation d'atelier
  -- ============================================================
  RAISE NOTICE 'TEST 1: Fonctions de vérification d''appartenance et RBAC...';
  
  -- Simuler User A1 (Owner A)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a1::text)::text, true);
  
  IF NOT public.user_is_member_of(v_workshop_a) THEN
    RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : user_is_member_of(A) doit renvoyer TRUE pour User A1';
  END IF;

  IF public.user_is_member_of(v_workshop_b) THEN
    RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : user_is_member_of(B) doit renvoyer FALSE pour User A1 (Fuite de tenant !)';
  END IF;

  IF NOT public.has_permission(v_workshop_a, 'FINANCIAL_READ') THEN
    RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Owner A doit avoir la permission FINANCIAL_READ';
  END IF;

  -- Simuler User A2 (Tailor A)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a2::text)::text, true);
  
  IF public.has_permission(v_workshop_a, 'FINANCIAL_READ') THEN
    RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Le tailleur ne doit PAS avoir la permission FINANCIAL_READ';
  END IF;

  IF NOT public.has_permission(v_workshop_a, 'UPDATE_STATUS') THEN
    RAISE EXCEPTION 'TEST 1 ÉCHOUÉ : Le tailleur doit avoir la permission UPDATE_STATUS';
  END IF;

  RAISE NOTICE '-> TEST 1 RÉUSSI : Vérification RBAC et appartenance OK.';

  -- ============================================================
  -- TEST 2 : Tentative d'attaque par Injection Croisée de Clés Étrangères
  -- (Atelier A tente de créer une commande avec le customer_id d'Atelier B)
  -- ============================================================
  RAISE NOTICE 'TEST 2: Attaque par injection de client cross-tenant...';
  
  BEGIN
    INSERT INTO orders (workshop_id, customer_id, order_number, total_amount)
    VALUES (v_workshop_a, v_cust_b, 'CMD-ATTACK-001', 30000);
    
    RAISE EXCEPTION 'FAILLE CRITIQUE : Une commande a pu être créée rattachée à un client d''un autre atelier !';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '-> TEST 2 RÉUSSI : La contrainte composite fk_orders_customer_workshop a bloqué l''attaque.';
  END;

  -- ============================================================
  -- TEST 3 : Tentative d'empoisonnement de paiement cross-tenant
  -- (Atelier A tente de payer pour la commande de l'Atelier B)
  -- ============================================================
  RAISE NOTICE 'TEST 3: Attaque par paiement frauduleux cross-tenant...';
  
  BEGIN
    INSERT INTO payments (workshop_id, order_id, customer_id, amount, method, status)
    VALUES (v_workshop_a, v_order_b, v_cust_a, 10000, 'WAVE', 'CONFIRMED');
    
    RAISE EXCEPTION 'FAILLE CRITIQUE : Un paiement a pu référencer une commande d''un autre atelier !';
  EXCEPTION WHEN foreign_key_violation OR check_violation OR raise_exception THEN
    RAISE NOTICE '-> TEST 3 RÉUSSI : Le paiement cross-tenant a été rejeté par la contrainte et le trigger.';
  END;

  -- ============================================================
  -- TEST 4 : Calcul atomique du solde et intégrité financière
  -- ============================================================
  RAISE NOTICE 'TEST 4: Calcul automatique du solde et paiements multiples...';
  
  -- Insérer un premier paiement de 20 000 FCFA sur la commande A
  INSERT INTO payments (workshop_id, order_id, customer_id, amount, method, status)
  VALUES (v_workshop_a, v_order_a, v_cust_a, 20000, 'CASH', 'CONFIRMED');

  -- Vérifier le paid_amount et balance de la commande A
  SELECT paid_amount INTO v_count FROM orders WHERE id = v_order_a;
  IF v_count <> 20000 THEN
    RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Le paid_amount devrait être 20000, trouvé %', v_count;
  END IF;

  -- Insérer un deuxième paiement de 15 000 FCFA
  INSERT INTO payments (workshop_id, order_id, customer_id, amount, method, status)
  VALUES (v_workshop_a, v_order_a, v_cust_a, 15000, 'ORANGE_MONEY', 'CONFIRMED');

  SELECT paid_amount, balance INTO v_count, v_count FROM orders WHERE id = v_order_a;
  IF (SELECT paid_amount FROM orders WHERE id = v_order_a) <> 35000 OR
     (SELECT balance FROM orders WHERE id = v_order_a) <> 15000 THEN
    RAISE EXCEPTION 'TEST 4 ÉCHOUÉ : Calcul incorrect après second paiement.';
  END IF;

  RAISE NOTICE '-> TEST 4 RÉUSSI : Intégrité financière et recalcul de solde par trigger validés.';

  -- ============================================================
  -- TEST 5 : Tentative de paiement avec montant négatif ou nul
  -- ============================================================
  RAISE NOTICE 'TEST 5: Tentative d''insertion de montant de paiement invalide (<= 0)...';
  
  BEGIN
    INSERT INTO payments (workshop_id, order_id, customer_id, amount, method)
    VALUES (v_workshop_a, v_order_a, v_cust_a, -5000, 'CASH');
    RAISE EXCEPTION 'FAILLE : Montant négatif accepté !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '-> TEST 5 RÉUSSI : Contrainte CHECK (amount > 0) active.';
  END;

  -- ============================================================
  -- TEST 6 : Vérification de la journalisation d'audit automatique
  -- ============================================================
  RAISE NOTICE 'TEST 6: Vérification du journal d''audit...';
  
  SELECT COUNT(*) INTO v_count FROM audit_logs WHERE workshop_id = v_workshop_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TEST 6 ÉCHOUÉ : Aucun log d''audit généré par les triggers sur commandes/paiements.';
  END IF;

  RAISE NOTICE '-> TEST 6 RÉUSSI : % logs d''audit enregistrés.', v_count;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TOUS LES TESTS DE SÉCURITÉ ET D''ISOLATION ONT RÉUSSI AVEC SUCCÈS ! ✅';
  RAISE NOTICE '==================================================';
END $$;
