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

  // 1. Consultation directe du profil utilisateur dans la table 'profiles'
  const { data: profile } = await supabase
    .from('profiles')
    .select('atelier_id, role, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (profile && profile.atelier_id) {
    // 2. Récupération de l'atelier correspondant dans 'ateliers'
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
        currency_symbol: 'FCFA',
        owner_id: userId,
        is_active: true,
        created_at: atelier.created_at || new Date().toISOString(),
        updated_at: atelier.created_at || new Date().toISOString(),
      };
      return { workshop: ws, role: profile.role || 'OWNER' };
    }
  }

  // 3. Fallback sur les tables 'workshops' et 'workshop_members' si configurées
  let attempt = 0;
  const maxAttempts = 3;
  const delays = [300, 600, 1000];

  while (attempt < maxAttempts) {
    const { data: memberRows, error: memberErr } = await supabase
      .from('workshop_members')
      .select('role, workshops (*)')
      .eq('user_id', userId)
      .limit(1);

    if (!memberErr && memberRows && memberRows.length > 0 && memberRows[0].workshops) {
      const ws = memberRows[0].workshops as unknown as Workshop;
      return { workshop: ws, role: memberRows[0].role || 'OWNER' };
    }

    const { data: ownedWorkshops, error: ownErr } = await supabase
      .from('workshops')
      .select('*')
      .eq('owner_id', userId)
      .limit(1);

    if (!ownErr && ownedWorkshops && ownedWorkshops.length > 0) {
      const ws = ownedWorkshops[0] as Workshop;
      return { workshop: ws, role: 'OWNER' };
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
    attempt++;
  }

  // 4. Si aucun atelier n'existe encore, créer un atelier par défaut
  const defaultName = userFullName ? `Atelier de ${userFullName}` : 'Mon Atelier';
  const { data: createdAtelier } = await supabase
    .from('ateliers')
    .insert({ name: defaultName })
    .select()
    .maybeSingle();

  if (createdAtelier) {
    await supabase.from('profiles').upsert({
      id: userId,
      atelier_id: createdAtelier.id,
      full_name: userFullName || '',
      role: 'owner',
    });

    return {
      workshop: {
        id: createdAtelier.id,
        name: createdAtelier.name,
        currency: 'XOF',
        currency_symbol: 'FCFA',
        owner_id: userId,
        is_active: true,
        created_at: createdAtelier.created_at,
        updated_at: createdAtelier.created_at,
      },
      role: 'OWNER',
    };
  }

  throw new Error('TIMEOUT: Profil atelier introuvable après création. Le backend Supabase a peut-être échoué.');
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
    client.from('orders').select('*').eq('workshop_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }).then(async res => {
      if (res.error && res.error.message?.includes('workshop_id')) {
        const { data: ordersAlt } = await client.from('orders').select('*').eq('atelier_id', workshopId).order('created_at', { ascending: false });
        return { data: ordersAlt || [], error: null };
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
