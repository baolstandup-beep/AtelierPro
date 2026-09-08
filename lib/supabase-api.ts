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

  // 1. Chercher si l'utilisateur est propriétaire ou membre d'un atelier
  const { data: memberRows, error: memberErr } = await supabase
    .from('workshop_members')
    .select('role, workshops (*)')
    .eq('user_id', userId)
    .limit(1);

  if (!memberErr && memberRows && memberRows.length > 0 && memberRows[0].workshops) {
    const ws = memberRows[0].workshops as unknown as Workshop;
    return { workshop: ws, role: memberRows[0].role || 'OWNER' };
  }

  // 2. Chercher si l'utilisateur est propriétaire direct dans workshops
  const { data: ownedWorkshops, error: ownErr } = await supabase
    .from('workshops')
    .select('*')
    .eq('owner_id', userId)
    .limit(1);

  if (!ownErr && ownedWorkshops && ownedWorkshops.length > 0) {
    const ws = ownedWorkshops[0] as Workshop;
    return { workshop: ws, role: 'OWNER' };
  }

  // 3. Si aucun atelier n'existe pour cet utilisateur, on en crée un automatiquement
  const workshopName = userFullName
    ? `Atelier ${userFullName.trim()}`
    : 'Mon Atelier de Couture';

  const { data: newWorkshop, error: createWsErr } = await supabase
    .from('workshops')
    .insert({
      name: workshopName,
      owner_id: userId,
      currency: 'XOF',
      currency_symbol: 'FCFA',
      is_active: true,
    })
    .select()
    .single();

  if (createWsErr || !newWorkshop) {
    console.error('[Supabase] Erreur création workshop:', createWsErr);
    throw new Error(createWsErr?.message || 'Impossible de créer votre atelier.');
  }

  // Ajouter l'utilisateur comme OWNER dans workshop_members
  await supabase.from('workshop_members').insert({
    workshop_id: newWorkshop.id,
    user_id: userId,
    role: 'OWNER',
    status: 'ACTIVE',
  });

  // Insérer les types de mesures par défaut pour ce nouvel atelier
  const DEFAULT_TYPES = [
    { name: 'Tour de cou', unit: 'cm', sort_order: 1 },
    { name: 'Épaule', unit: 'cm', sort_order: 2 },
    { name: 'Poitrine', unit: 'cm', sort_order: 3 },
    { name: 'Taille', unit: 'cm', sort_order: 4 },
    { name: 'Hanche', unit: 'cm', sort_order: 5 },
    { name: 'Bassin', unit: 'cm', sort_order: 6 },
    { name: 'Longueur manches', unit: 'cm', sort_order: 7 },
    { name: 'Tour de bras', unit: 'cm', sort_order: 8 },
    { name: 'Longueur boubou', unit: 'cm', sort_order: 9 },
    { name: 'Longueur pantalon', unit: 'cm', sort_order: 10 },
    { name: 'Cuisse', unit: 'cm', sort_order: 11 },
    { name: 'Genou', unit: 'cm', sort_order: 12 },
    { name: 'Bas de pantalon', unit: 'cm', sort_order: 13 },
    { name: 'Longueur chemise', unit: 'cm', sort_order: 14 },
  ];

  await supabase.from('measurement_types').insert(
    DEFAULT_TYPES.map((t) => ({
      workshop_id: newWorkshop.id,
      name: t.name,
      unit: t.unit,
      sort_order: t.sort_order,
      is_custom: false,
    }))
  );

  return { workshop: newWorkshop as Workshop, role: 'OWNER' };
}

/**
 * ─── 2. Chargement de l'ensemble des données d'un atelier ───
 */
export async function dbFetchWorkshopFullData(workshopId: string): Promise<SyncedWorkshopData> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  // 1. Atelier
  const { data: wsData, error: wsErr } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', workshopId)
    .single();

  if (wsErr || !wsData) {
    throw new Error(wsErr?.message || 'Atelier introuvable');
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
    supabase.from('customers').select('*').eq('workshop_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('orders').select('*').eq('workshop_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('order_items').select('*').eq('workshop_id', workshopId),
    supabase.from('payments').select('*').eq('workshop_id', workshopId).order('payment_date', { ascending: false }),
    supabase.from('measurement_profiles').select('*').eq('workshop_id', workshopId).order('taken_at', { ascending: false }),
    supabase.from('measurement_values').select('*').eq('workshop_id', workshopId),
    supabase.from('measurement_types').select('*').eq('workshop_id', workshopId).order('sort_order', { ascending: true }),
    supabase.from('expenses').select('*').eq('workshop_id', workshopId).order('expense_date', { ascending: false }),
    supabase.from('workshop_members').select('*, profiles:user_id (*)').eq('workshop_id', workshopId),
    supabase.from('notifications').select('*').eq('workshop_id', workshopId).order('created_at', { ascending: false }).limit(50),
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

  const { data, error } = await supabase
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
    .single();

  if (error || !data) throw error;
  return data as Customer;
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
    .single();

  if (error || !data) throw error;
  return data as Customer;
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

  const totalAmount = input.items.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0);
  const paidAmount = input.initial_payment && input.initial_payment > 0 ? input.initial_payment : 0;
  const balance = Math.max(0, totalAmount - paidAmount);
  const orderNumber = generateOrderNumber(new Date().getFullYear(), Math.floor(Math.random() * 900) + 100);

  // 1. Créer la commande
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .insert({
      workshop_id: workshopId,
      customer_id: input.customer_id,
      order_number: orderNumber,
      status: 'NEW',
      priority: input.priority || 'NORMAL',
      total_amount: totalAmount,
      paid_amount: paidAmount,
      balance: balance,
      order_date: new Date().toISOString(),
      due_date: input.due_date || null,
      assigned_to: input.assigned_to || null,
      notes: input.notes?.trim() || null,
      created_by: userId || null,
    })
    .select()
    .single();

  if (orderErr || !orderData) throw orderErr;

  // 2. Créer les articles de confection (order_items)
  const itemsToInsert = input.items.map((item) => ({
    order_id: orderData.id,
    workshop_id: workshopId,
    name: item.name.trim(),
    garment_type: item.garment_type || null,
    fabric: item.fabric || null,
    color: item.color || null,
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    notes: item.notes || null,
  }));

  const { data: itemsData, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsToInsert)
    .select();

  if (itemsErr) {
    console.error('[Supabase] Erreur insertion articles:', itemsErr);
  }

  // 3. Enregistrer l'acompte initial dans payments si présent
  let createdPayment: Payment | undefined;
  if (paidAmount > 0) {
    const paymentMethod = input.initial_payment_method || input.payment_method || 'CASH';
    const { data: payData } = await supabase
      .from('payments')
      .insert({
        workshop_id: workshopId,
        order_id: orderData.id,
        customer_id: input.customer_id,
        amount: paidAmount,
        payment_method: paymentMethod,
        status: 'CONFIRMED',
        payment_date: new Date().toISOString(),
        notes: 'Acompte initial à la commande',
        created_by: userId || null,
      })
      .select()
      .single();

    if (payData) {
      createdPayment = {
        ...payData,
        method: payData.payment_method,
      } as Payment;
    }
  }

  return {
    order: {
      ...orderData,
      items: (itemsData || []) as OrderItem[],
    } as Order,
    items: (itemsData || []) as OrderItem[],
    initialPayment: createdPayment,
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
  return data as Order;
}

export async function dbDeleteOrder(orderId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) throw error;
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
      payment_method: input.method || 'CASH',
      status: (input.method === 'WAVE' || input.method === 'ORANGE_MONEY') ? 'PENDING' : 'CONFIRMED',
      reference: input.reference || null,
      notes: input.notes || null,
      payment_date: input.payment_date || new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (payErr || !payData) throw payErr;

  // 2. Mettre à jour les montants de la commande correspondante
  let updatedOrder: Order | undefined;
  const { data: orderData } = await supabase
    .from('orders')
    .select('id, total_amount, paid_amount')
    .eq('id', input.order_id)
    .single();

  if (orderData && payData.status === 'CONFIRMED') {
    const newPaid = Number(orderData.paid_amount || 0) + Number(input.amount);
    const newBalance = Math.max(0, Number(orderData.total_amount || 0) - newPaid);

    const { data: updatedOrd } = await supabase
      .from('orders')
      .update({
        paid_amount: newPaid,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.order_id)
      .select()
      .single();

    if (updatedOrd) updatedOrder = updatedOrd as Order;
  }

  return {
    payment: {
      ...payData,
      method: payData.payment_method,
    } as Payment,
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
