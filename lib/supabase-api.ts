
/* old */ function oldMapOrder(dbOrder: any): any {
  if (!dbOrder) return dbOrder;
  return {
    ...dbOrder,
    workshop_id: dbOrder.atelier_id,
    customer_id: dbOrder.client_id,
    order_number: dbOrder.title,
    notes: dbOrder.description
  };
}
import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Workshop,
  Customer,
  Order,
  OrderItem,
  Payment,
  MeasurementProfile,
  MeasurementType,
  MeasurementValue,
  Expense,
  Notification,
  WorkshopMember,
  CreateCustomerInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateMeasurementInput,
  OrderStatus,
} from './types';
import { generateOrderNumber } from './utils';

export interface SyncedWorkshopData {
  workshop: Workshop;
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  measurementProfiles: MeasurementProfile[];
  measurementTypes: MeasurementType[];
  expenses: Expense[];
  members: WorkshopMember[];
  notifications: Notification[];
}

/**
 * ─── 1. Initialisation / Récupération de l'atelier de l'utilisateur ───
 */
export async function dbGetOrCreateUserWorkshop(userId: string, userFullName?: string): Promise<{ workshop: Workshop; role: string }> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  // 1. Source primaire : workshop_members (chemin canonique après inscription)
  const { data: memberRows, error: memberErr } = await supabase
    .from('workshop_members')
    .select('role, workshops (*)')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .limit(1);

  if (!memberErr && memberRows && memberRows.length > 0 && memberRows[0].workshops) {
    const ws = memberRows[0].workshops as unknown as Workshop;
    return { workshop: ws, role: memberRows[0].role || 'OWNER' };
  }

  // 2. Fallback : workshops dont l'utilisateur est owner_id
  const { data: ownedWorkshops } = await supabase
    .from('workshops')
    .select('*')
    .eq('owner_id', userId)
    .limit(1);

  if (ownedWorkshops && ownedWorkshops.length > 0) {
    const ws = ownedWorkshops[0] as Workshop;
    // Réparation : créer workshop_members manquant
    await supabase.from('workshop_members').upsert({
      workshop_id: ws.id,
      user_id: userId,
      role: 'OWNER',
      status: 'ACTIVE',
    }, { onConflict: 'workshop_id,user_id' });
    return { workshop: ws, role: 'OWNER' };
  }

  // 3. Fallback legacy : profiles.atelier_id → ateliers
  const { data: profile } = await supabase
    .from('profiles')
    .select('atelier_id, role, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (profile && profile.atelier_id) {
    const { data: atelier } = await supabase
      .from('ateliers')
      .select('*')
      .eq('id', profile.atelier_id)
      .maybeSingle();

    if (atelier) {
      const ws: Workshop = {
        id: atelier.id,
        name: atelier.name || 'Mon Atelier',
        phone: atelier.phone || undefined,
        address: atelier.address || undefined,
        city: undefined,
        logo_url: undefined,
        currency: atelier.currency || 'XOF',
        currency_symbol: atelier.currency_symbol || 'FCFA',
        owner_id: userId,
        is_active: true,
        created_at: atelier.created_at || new Date().toISOString(),
        updated_at: atelier.updated_at || new Date().toISOString(),
      };
      return { workshop: ws, role: profile.role || 'OWNER' };
    }
  }

  // 4. Aucun atelier trouvé — créer un workshop par défaut dans la table canonique
  const defaultName = userFullName ? `Atelier de ${userFullName}` : 'Mon Atelier';
  const { data: newWs, error: wsErr } = await supabase
    .from('workshops')
    .insert({
      name: defaultName,
      owner_id: userId,
      currency: 'XOF',
      currency_symbol: 'FCFA',
      is_active: true,
    })
    .select()
    .single();

  if (!wsErr && newWs) {
    // Créer l'entrée workshop_members
    await supabase.from('workshop_members').insert({
      workshop_id: newWs.id,
      user_id: userId,
      role: 'OWNER',
      status: 'ACTIVE',
    });
    // Mettre à jour le profil
    await supabase.from('profiles').upsert({
      id: userId,
      atelier_id: newWs.id,
      full_name: userFullName || '',
      role: 'owner',
    });
    return { workshop: newWs as Workshop, role: 'OWNER' };
  }

  throw new Error('ATELIER_NOT_FOUND: Impossible de résoudre ou créer l\'atelier pour cet utilisateur.');
}


/**
 * ─── 2. Chargement de l'ensemble des données d'un atelier ───
 */
export async function dbFetchWorkshopFullData(workshopId: string): Promise<SyncedWorkshopData> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  const client = supabase;

  // 1. Atelier (avec support direct de 'ateliers' ou 'workshops')
  let wsData: any = null;
  const { data: directWs } = await client
    .from('workshops')
    .select('*')
    .eq('id', workshopId)
    .maybeSingle();

  if (directWs) {
    wsData = directWs;
  } else {
    const { data: atData } = await client
      .from('ateliers')
      .select('*')
      .eq('id', workshopId)
      .maybeSingle();

    if (atData) {
      wsData = {
        id: atData.id,
        name: atData.name,
        phone: atData.phone,
        address: atData.address,
        currency: atData.currency || 'XOF',
        currency_symbol: 'FCFA',
        is_active: true,
        created_at: atData.created_at,
        updated_at: atData.created_at,
      };
    }
  }

  if (!wsData) {
    wsData = {
      id: workshopId,
      name: 'Mon Atelier',
      currency: 'XOF',
      currency_symbol: 'FCFA',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // 2. Requêtes parallèles pour toutes les tables de l'atelier
  const [
    customersRes,
    ordersRes,
    orderItemsRes,
    paymentsRes,
    profilesRes,
    valuesRes,
    typesRes,
    expensesRes,
    membersRes,
    notificationsRes,
  ] = await Promise.all([
    client.from('customers').select('*').eq('workshop_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }).then(async res => {
      if (res.error && res.error.message?.includes('not find the table')) {
        const { data: clientsData } = await client.from('clients').select('*').eq('atelier_id', workshopId).order('created_at', { ascending: false });
        return {
          data: (clientsData || []).map((c: any) => ({
            id: c.id,
            workshop_id: workshopId,
            full_name: c.name || '',
            phone: c.phone || '',
            gender: c.gender || 'OTHER',
            notes: c.notes || '',
            created_at: c.created_at,
            updated_at: c.updated_at || c.created_at,
          })),
          error: null,
        };
      }
      return res;
    }),
    client.from('orders').select('*').eq('atelier_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }).then(async res => {
      // Mapping real DB columns to frontend types
      const mapOrder = (dbOrder: any) => ({
        ...dbOrder,
        workshop_id: dbOrder.atelier_id,
        customer_id: dbOrder.client_id,
        order_number: dbOrder.title,
        notes: dbOrder.description
      });
      if (res.data) res.data = res.data.map(mapOrder);
      
      if (res.error) {
        // Fallback or just return
        const { data: ordersAlt } = await client.from('orders').select('*').eq('atelier_id', workshopId).order('created_at', { ascending: false });
        if (ordersAlt) return { data: ordersAlt.map(mapOrder), error: null };
      }
      return res;
    }),
    client.from('order_items').select('*').eq('workshop_id', workshopId).then(async res => {
      if (res.error && res.error.message?.includes('workshop_id')) {
        const { data: itemsAlt } = await client.from('order_items').select('*').eq('atelier_id', workshopId);
        return { data: itemsAlt || [], error: null };
      }
      return res;
    }),
    client.from('payments').select('*').eq('workshop_id', workshopId).order('payment_date', { ascending: false }).then(async res => {
      if (res.error && res.error.message?.includes('workshop_id')) {
        const { data: paysAlt } = await client.from('payments').select('*').eq('atelier_id', workshopId).order('created_at', { ascending: false });
        return { data: paysAlt || [], error: null };
      }
      return res;
    }),
    client.from('measurement_profiles').select('*').eq('workshop_id', workshopId).order('taken_at', { ascending: false }).then(res => ({ data: res.data || [], error: null })),
    client.from('measurement_values').select('*').eq('workshop_id', workshopId).then(res => ({ data: res.data || [], error: null })),
    client.from('measurement_types').select('*').eq('workshop_id', workshopId).order('sort_order', { ascending: true }).then(res => ({ data: res.data || [], error: null })),
    client.from('expenses').select('*').eq('workshop_id', workshopId).order('expense_date', { ascending: false }).then(res => ({ data: res.data || [], error: null })),
    client.from('workshop_members').select('*, profiles:user_id (*)').eq('workshop_id', workshopId).then(async res => {
      if (res.error && res.error.message?.includes('workshop_members')) {
        const { data: tm } = await client.from('team_members').select('*').eq('atelier_id', workshopId);
        return { data: tm || [], error: null };
      }
      return res;
    }),
    client.from('notifications').select('*').eq('workshop_id', workshopId).order('created_at', { ascending: false }).limit(50).then(async res => {
      if (res.error && res.error.message?.includes('workshop_id')) {
        const { data: notifsAlt } = await client.from('notifications').select('*').eq('atelier_id', workshopId).limit(50);
        return { data: notifsAlt || [], error: null };
      }
      return res;
    }),
  ]);

  const rawCustomers: Customer[] = (customersRes.data || []) as Customer[];
  const rawOrders: Order[] = (ordersRes.data || []) as Order[];
  const rawOrderItems: OrderItem[] = (orderItemsRes.data || []) as OrderItem[];
  const rawPayments: Payment[] = (paymentsRes.data || []).map((p: any) => ({
    ...p,
    method: p.payment_method || p.method || 'CASH',
  })) as Payment[];
  const rawProfiles: MeasurementProfile[] = (profilesRes.data || []) as MeasurementProfile[];
  const rawValues: MeasurementValue[] = (valuesRes.data || []) as MeasurementValue[];
  const rawTypes: MeasurementType[] = (typesRes.data || []) as MeasurementType[];
  const rawExpenses: Expense[] = (expensesRes.data || []) as Expense[];
  const rawMembers: WorkshopMember[] = (membersRes.data || []) as WorkshopMember[];
  const rawNotifications: Notification[] = (notificationsRes.data || []) as Notification[];

  // Joindre les items et customer aux commandes
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of rawOrderItems) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const customerMap = new Map<string, Customer>();
  for (const cust of rawCustomers) {
    customerMap.set(cust.id, cust);
  }

  const enrichedOrders: Order[] = rawOrders.map((ord) => ({
    ...ord,
    customer: customerMap.get(ord.customer_id),
    items: itemsByOrder.get(ord.id) || [],
  }));

  // Joindre les valeurs aux fiches de mesures
  const valuesByProfile = new Map<string, MeasurementValue[]>();
  for (const val of rawValues) {
    const list = valuesByProfile.get(val.profile_id) || [];
    list.push(val);
    valuesByProfile.set(val.profile_id, list);
  }

  const enrichedMeasurementProfiles: MeasurementProfile[] = rawProfiles.map((prof) => ({
    ...prof,
    values: valuesByProfile.get(prof.id) || [],
  }));

  return {
    workshop: wsData as Workshop,
    customers: rawCustomers,
    orders: enrichedOrders,
    payments: rawPayments,
    measurementProfiles: enrichedMeasurementProfiles,
    measurementTypes: rawTypes,
    expenses: rawExpenses,
    members: rawMembers,
    notifications: rawNotifications,
  };
}

/**
 * ─── 3. Operations Clients (CRUD) ───
 */
export async function dbCreateCustomer(workshopId: string, input: CreateCustomerInput, userId?: string): Promise<Customer> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const res = await supabase
    .from('customers')
    .insert({
      workshop_id: workshopId,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      gender: input.gender || 'OTHER',
      notes: input.notes?.trim() || null,
      created_by: userId || null,
    })
    .select()
    .maybeSingle();

  if (res.data) return res.data as Customer;

  // Fallback sur la table 'clients'
  const genderMap: Record<string, string> = {
    MALE: 'homme',
    FEMALE: 'femme',
    homme: 'homme',
    femme: 'femme',
  };
  const clientGender = input.gender ? (genderMap[input.gender] || null) : null;

  const { data: client, error: clErr } = await supabase
    .from('clients')
    .insert({
      atelier_id: workshopId,
      name: input.full_name.trim(),
      phone: input.phone.trim(),
      notes: input.notes?.trim() || null,
      gender: clientGender,
    })
    .select()
    .single();

  if (clErr) throw new Error(clErr.message);

  return {
    id: client.id,
    workshop_id: workshopId,
    full_name: client.name,
    phone: client.phone || '',
    gender: (client.gender as any) || 'OTHER',
    notes: client.notes || '',
    created_at: client.created_at,
    updated_at: client.created_at,
  };
}

export async function dbUpdateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { data, error } = await supabase
    .from('customers')
    .update({
      full_name: input.full_name?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      gender: input.gender,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .select()
    .maybeSingle();

  if (data) return data as Customer;

  // Fallback sur 'clients'
  const genderMap: Record<string, string> = {
    MALE: 'homme',
    FEMALE: 'femme',
    homme: 'homme',
    femme: 'femme',
  };
  const clientGender = input.gender ? (genderMap[input.gender] || null) : undefined;

  const updatePayload: any = {
    name: input.full_name?.trim(),
    phone: input.phone?.trim(),
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (clientGender !== undefined) {
    updatePayload.gender = clientGender;
  }

  const { data: client, error: clErr } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', customerId)
    .select()
    .single();

  if (clErr) throw new Error(clErr.message);

  return {
    id: client.id,
    workshop_id: client.atelier_id,
    full_name: client.name,
    phone: client.phone || '',
    gender: (client.gender as any) || 'OTHER',
    notes: client.notes || '',
    created_at: client.created_at,
    updated_at: client.updated_at || client.created_at,
  };
}

export async function dbDeleteCustomer(customerId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  // Soft delete pour préserver l'historique comptable
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId);

  if (error) throw error;
}

/**
 * ─── 4. Operations Commandes & Articles (CRUD) ───
 */
export async function dbCreateOrder(
  workshopId: string,
  input: CreateOrderInput,
  userId?: string
): Promise<{ order: Order; items: OrderItem[]; initialPayment?: Payment }> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');
  console.log("========== CREATE ORDER START ==========");
  console.log("STEP 0 AUTH", {
    userId,
    atelierId: workshopId,
    clientId: input.customer_id
  });

  const totalAmount = input.items.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
  const paidAmount = input.initial_payment && input.initial_payment > 0 ? input.initial_payment : 0;
  const balance = Math.max(0, totalAmount - paidAmount);

  if (!workshopId) throw new Error("atelier_id est manquant");
  if (!input.customer_id) throw new Error("client_id est manquant");

  const orderNumber = generateOrderNumber(new Date().getFullYear(), Math.floor(Math.random() * 900) + 100);

  const orderPayload = {
    atelier_id: workshopId,
    client_id: input.customer_id,
    title: orderNumber,
    description: input.notes?.trim() || null,
    status: 'NEW',
    priority: input.priority || 'NORMAL',
    total_amount: totalAmount,
    paid_amount: paidAmount,
    due_date: input.due_date || null,
  };

  console.log("STEP 1 ORDER PAYLOAD", orderPayload);

  // 1. Créer la commande
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();

  console.log("STEP 1 ORDER RESULT", {
    data: orderData,
    error: orderErr
  });

  if (orderErr || !orderData) {
    console.error("❌ STEP 1 ORDERS FAILED", {
      code: orderErr?.code,
      message: orderErr?.message,
      details: orderErr?.details,
      hint: orderErr?.hint
    });
    const errorToThrow = orderErr || new Error("No data returned from order creation");
    throw errorToThrow;
  }
  
  console.log("✅ ORDER CREATED:", orderData.id);

  console.log("STEP 2 ORDER ITEMS");
  const itemsPayload = input.items.map((item) => {
    let label = item.name.trim();
    const extras = [];
    if (item.garment_type) extras.push(item.garment_type);
    if (item.fabric) extras.push(item.fabric);
    if (item.color) extras.push(item.color);
    if (item.notes) extras.push(item.notes);

    if (extras.length > 0) {
      label += ` (${extras.join(', ')})`;
    }

    return {
      order_id: orderData.id,
      atelier_id: workshopId,
      label: label,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    };
  });
  console.log("ORDER ITEMS PAYLOAD", itemsPayload);

  const { data: itemsData, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsPayload)
    .select();

  console.log("ORDER ITEMS RESULT", {
    data: itemsData,
    error: itemsErr
  });

  if (itemsErr) {
    console.error("❌ STEP 2 ORDER_ITEMS FAILED", {
      code: itemsErr?.code,
      message: itemsErr?.message,
      details: itemsErr?.details,
      hint: itemsErr?.hint
    });
  }

  // 3. Enregistrer l'acompte initial dans payments si présent
  let createdPayment: Payment | undefined;
  if (paidAmount > 0) {
    const paymentMethodRaw = input.initial_payment_method || input.payment_method || 'CASH';

    const paymentPayload = {
      workshop_id: workshopId,
      order_id: orderData.id,
      customer_id: input.customer_id,
      amount: paidAmount,
      method: paymentMethodRaw,
      status: 'CONFIRMED',
      notes: 'Acompte initial à la commande',
      payment_date: new Date().toISOString(),
    };
    console.log("PAYMENT PAYLOAD", paymentPayload);

    const { data: payData, error: payErr } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select()
      .single();

    console.log("PAYMENT RESULT", {
      data: payData,
      error: payErr
    });

    if (payErr) {
      console.error("❌ STEP 3 PAYMENT FAILED", {
        code: payErr?.code,
        message: payErr?.message,
        details: payErr?.details,
        hint: payErr?.hint
      });
    }

    if (payData) {
      createdPayment = payData as Payment;
    }
  }

  return {
    order: {
      ...orderData,
      id: orderData.id,
      workshop_id: orderData.workshop_id || workshopId,
      customer_id: orderData.customer_id || input.customer_id,
      order_number: orderData.order_number || orderNumber,
      status: orderData.status || 'NEW',
      priority: orderData.priority || input.priority || 'NORMAL',
      total_amount: Number(orderData.total_amount || totalAmount),
      paid_amount: Number(orderData.paid_amount || paidAmount),
      balance: Number(orderData.balance || balance),
      order_date: orderData.order_date || new Date().toISOString(),
      due_date: orderData.due_date || input.due_date,
      notes: orderData.notes || input.notes,
      items: itemsData || [],
    } as any,
    items: (itemsData || []) as any,
    initialPayment: createdPayment ? {
      ...createdPayment,
      payment_method: createdPayment.method,
      payment_date: createdPayment.payment_date || createdPayment.created_at,
    } as any : undefined,
  };
}

export async function dbUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error || !data) throw error;
  return mapOrderToFrontend(data);
}

export async function dbDeleteOrder(orderId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) throw error;
}

export async function dbUpdateOrder(
  orderId: string,
  updates: Partial<Pick<Order, 'status' | 'due_date' | 'notes' | 'priority'>>
): Promise<Order> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  // Exclure 'balance' des mises à jour (colonne GENERATED ALWAYS)
  const safeUpdates: Record<string, unknown> = {};
  if (updates.status !== undefined) safeUpdates.status = updates.status;
  if (updates.due_date !== undefined) safeUpdates.due_date = updates.due_date;
  if (updates.notes !== undefined) safeUpdates.description = updates.notes; // mapped
  if (updates.priority !== undefined) safeUpdates.priority = updates.priority;

  const { data, error } = await supabase
    .from('orders')
    .update(safeUpdates)
    .eq('id', orderId)
    .select()
    .single();

  if (error || !data) throw error || new Error('Mise à jour commande échouée');
  return mapOrderToFrontend(data);
}


/**
 * ─── 5. Operations Paiements ───
 */
export async function dbCreatePayment(
  workshopId: string,
  input: CreatePaymentInput,
  userId?: string
): Promise<{ payment: Payment; updatedOrder?: Order }> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  // 1. Enregistrer le paiement
  const { data: payData, error: payErr } = await supabase
    .from('payments')
    .insert({
      workshop_id: workshopId,
      order_id: input.order_id,
      customer_id: input.customer_id,
      amount: input.amount,
      method: input.method || 'CASH',
      status: (input.method === 'WAVE' || input.method === 'ORANGE_MONEY') ? 'PENDING' : 'CONFIRMED',
      reference: input.reference || null,
      notes: input.notes || null,
      payment_date: input.payment_date || new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (payErr || !payData) throw payErr;

  // 2. La mise à jour de paid_amount/balance sur la commande est gérée automatiquement
  // par le trigger PostgreSQL trg_payment_recalc_after_change.
  // On relit simplement la commande pour avoir les valeurs à jour.
  let updatedOrder: Order | undefined;
  if (payData.status === 'CONFIRMED') {
    const { data: freshOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', input.order_id)
      .single();

    if (freshOrder) updatedOrder = freshOrder as Order;
  }

  return {
    // payData.method est le nom réel de la colonne DB — pas payData.payment_method
    payment: payData as Payment,
    updatedOrder,
  };
}

/**
 * ─── 6. Operations Mesures & Gabarits ───
 */
export async function dbCreateMeasurementProfile(
  workshopId: string,
  input: CreateMeasurementInput
): Promise<MeasurementProfile> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  // 1. Créer la fiche profile
  const { data: profileData, error: profErr } = await supabase
    .from('measurement_profiles')
    .insert({
      workshop_id: workshopId,
      customer_id: input.customer_id,
      label: input.label || 'Mesures Standard',
      notes: input.notes || null,
      fabric_image_url: input.fabric_image_url || null,
      model_image_url: input.model_image_url || null,
      fabric_type: input.fabric_type || null,
      taken_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profErr || !profileData) throw profErr;

  // 2. Insérer les valeurs de mensurations
  if (input.values && input.values.length > 0) {
    const valuesToInsert = input.values.map((v) => ({
      profile_id: profileData.id,
      workshop_id: workshopId,
      measurement_type_id: v.measurement_type_id,
      value: v.value,
      unit: v.unit || 'cm',
    }));

    await supabase.from('measurement_values').insert(valuesToInsert);
  }

  return profileData as MeasurementProfile;
}

/**
 * ─── 7. Operations Dépenses ───
 */
export async function dbCreateExpense(
  workshopId: string,
  input: Omit<Expense, 'id' | 'workshop_id' | 'created_at' | 'updated_at'>,
  userId?: string
): Promise<Expense> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      workshop_id: workshopId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      expense_date: input.expense_date,
      payment_method: input.payment_method || 'CASH',
      created_by: userId || null,
    })
    .select()
    .single();

  if (error || !data) throw error;
  return data as Expense;
}

export async function dbDeleteExpense(expenseId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

/**
 * ─── 7. Operations Mesures (suppression) ───
 */
export async function dbDeleteMeasurementProfile(profileId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  // 1. Supprimer d'abord les valeurs associées (évite violation FK si ON DELETE CASCADE non configuré)
  const { error: valErr } = await supabase
    .from('measurement_values')
    .delete()
    .eq('profile_id', profileId);

  if (valErr) throw valErr;

  // 2. Supprimer le profil de mesure
  const { error: profErr } = await supabase
    .from('measurement_profiles')
    .delete()
    .eq('id', profileId);

  if (profErr) throw profErr;
}

/**
 * ─── 8. Operations Membres Atelier ───
 */
export async function dbInviteMember(
  workshopId: string,
  userId: string,
  role: string = 'EMPLOYEE'
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('workshop_members')
    .upsert({
      workshop_id: workshopId,
      user_id: userId,
      role,
      status: 'ACTIVE',
    }, { onConflict: 'workshop_id,user_id' });

  if (error) throw error;
}

export async function dbUpdateMemberRole(
  workshopId: string,
  userId: string,
  role: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('workshop_members')
    .update({ role })
    .eq('workshop_id', workshopId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function dbToggleMemberStatus(
  workshopId: string,
  userId: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('workshop_members')
    .update({ status })
    .eq('workshop_id', workshopId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function dbRemoveMember(
  workshopId: string,
  userId: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('workshop_members')
    .delete()
    .eq('workshop_id', workshopId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Globally available mapping function
export function mapOrderToFrontend(dbOrder: any): any {
  if (!dbOrder) return dbOrder;
  return {
    ...dbOrder,
    workshop_id: dbOrder.atelier_id || dbOrder.workshop_id,
    customer_id: dbOrder.client_id || dbOrder.customer_id,
    order_number: dbOrder.title || dbOrder.order_number,
    notes: dbOrder.description || dbOrder.notes
  };
}
