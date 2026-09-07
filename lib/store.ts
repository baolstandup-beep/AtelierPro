'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Workshop,
  WorkshopMember,
  Customer,
  Order,
  Payment,
  MeasurementProfile,
  MeasurementType,
  Expense,
  Notification,
  AuditLog,
  UserRole,
  CreateCustomerInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateMeasurementInput,
  OrderStatus,
  DashboardStats,
  RecentActivity,
} from './types';
import { generateOrderNumber, isDueDateLate } from './utils';
import { format } from 'date-fns';
import { isSupabaseConfigured, signOutUser } from './supabase';
import {
  dbGetOrCreateUserWorkshop,
  dbFetchWorkshopFullData,
  dbCreateCustomer,
  dbUpdateCustomer,
  dbDeleteCustomer,
  dbCreateOrder,
  dbUpdateOrderStatus,
  dbDeleteOrder,
  dbCreatePayment,
  dbCreateMeasurementProfile,
  dbCreateExpense,
  dbDeleteExpense,
} from './supabase-api';

// ─── Demo data ────────────────────────────────────────────────
const DEMO_WORKSHOP: Workshop = {
  id: 'demo-workshop-001',
  name: 'Atelier Couture Dakar',
  phone: '+221 77 303 31 96',
  address: 'Rue 12, Médina',
  city: 'Dakar',
  currency: 'XOF',
  currency_symbol: 'FCFA',
  owner_id: 'demo-user-001',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_MEASUREMENT_TYPES: MeasurementType[] = [
  { id: 'mt-01', workshop_id: 'demo-workshop-001', name: 'Tour de cou', unit: 'cm', sort_order: 1, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-02', workshop_id: 'demo-workshop-001', name: 'Épaule', unit: 'cm', sort_order: 2, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-03', workshop_id: 'demo-workshop-001', name: 'Poitrine', unit: 'cm', sort_order: 3, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-04', workshop_id: 'demo-workshop-001', name: 'Taille', unit: 'cm', sort_order: 4, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-05', workshop_id: 'demo-workshop-001', name: 'Hanche', unit: 'cm', sort_order: 5, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-06', workshop_id: 'demo-workshop-001', name: 'Bassin', unit: 'cm', sort_order: 6, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-07', workshop_id: 'demo-workshop-001', name: 'Longueur manches', unit: 'cm', sort_order: 7, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-08', workshop_id: 'demo-workshop-001', name: 'Tour de bras', unit: 'cm', sort_order: 8, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-09', workshop_id: 'demo-workshop-001', name: 'Longueur boubou', unit: 'cm', sort_order: 9, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-10', workshop_id: 'demo-workshop-001', name: 'Longueur pantalon', unit: 'cm', sort_order: 10, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-11', workshop_id: 'demo-workshop-001', name: 'Cuisse', unit: 'cm', sort_order: 11, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-12', workshop_id: 'demo-workshop-001', name: 'Genou', unit: 'cm', sort_order: 12, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-13', workshop_id: 'demo-workshop-001', name: 'Bas de pantalon', unit: 'cm', sort_order: 13, is_custom: false, created_at: new Date().toISOString() },
  { id: 'mt-14', workshop_id: 'demo-workshop-001', name: 'Longueur chemise', unit: 'cm', sort_order: 14, is_custom: false, created_at: new Date().toISOString() },
];

const DEMO_MEMBERS: WorkshopMember[] = [
  {
    id: 'member-01',
    workshop_id: 'demo-workshop-001',
    user_id: 'demo-user-001',
    role: 'OWNER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      id: 'demo-user-001',
      full_name: 'Mamadou Diallo',
      phone: '+221 77 123 45 67',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'member-02',
    workshop_id: 'demo-workshop-001',
    user_id: 'demo-user-002',
    role: 'TAILOR',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      id: 'demo-user-002',
      full_name: 'Fatou Sow',
      phone: '+221 78 234 56 78',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    workshop_id: 'demo-workshop-001',
    full_name: 'Aïssatou Diallo',
    phone: '+221 77 654 32 10',
    email: 'aissatou.diallo@gmail.com',
    city: 'Dakar',
    address: 'Plateau, Rue Carnot',
    notes: 'Cliente VIP fidèle. Préfère les broderies fil d\'or sur bazin riche.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-002',
    workshop_id: 'demo-workshop-001',
    full_name: 'Ousmane Sonko (Client)',
    phone: '+221 76 543 21 09',
    city: 'Dakar',
    address: 'Almadies',
    notes: 'Costumes traditionnels 3 pièces, col officier',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-001',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-001',
    order_number: 'CMD-2026-001',
    status: 'SEWING',
    priority: 'HIGH',
    total_amount: 85000,
    paid_amount: 50000,
    balance: 35000,
    order_date: format(new Date(Date.now() - 5 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'demo-user-002',
    notes: 'Grand Boubou Bazin Riche blanc cassé avec broderie dorée au col.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'item-01',
        order_id: 'ord-001',
        workshop_id: 'demo-workshop-001',
        name: 'Grand Boubou 3 pièces Bazin Riche',
        garment_type: 'BOUBOU',
        fabric: 'Bazin Riche Getzner',
        color: 'Blanc cassé',
        quantity: 1,
        unit_price: 85000,
        notes: 'Broderie point de croix fil or',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
  },
];

const DEMO_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-001',
    customer_id: 'cust-001',
    amount: 50000,
    method: 'WAVE',
    status: 'CONFIRMED',
    reference: 'WAV-2026-001',
    notes: 'Acompte 58% versé à la commande via Wave',
    payment_date: format(new Date(Date.now() - 5 * 86400000), 'yyyy-MM-dd'),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_MEASUREMENT_PROFILES: MeasurementProfile[] = [
  {
    id: 'prof-001',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-001',
    label: 'Mesures Grand Boubou Bazin',
    notes: 'Coupe ample sénégalaise',
    fabric_type: 'Bazin Riche',
    taken_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    values: [
      { id: 'v1', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-01', value: 38, unit: 'cm' },
      { id: 'v2', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-02', value: 42, unit: 'cm' },
      { id: 'v3', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-03', value: 92, unit: 'cm' },
      { id: 'v4', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-04', value: 76, unit: 'cm' },
      { id: 'v5', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-09', value: 145, unit: 'cm' },
    ],
  },
];

const DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp-01',
    workshop_id: 'demo-workshop-001',
    category: 'TISSU',
    description: 'Bazin riche Getzner 10m',
    amount: 45000,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'WAVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── Store interface ──────────────────────────────────────────
export interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  currentUserId: string | null;
  currentUserName: string;
  currentUserRole: UserRole;
  currentWorkshop: Workshop | null;
  isOnboardingDone: boolean;

  // Data
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  measurementProfiles: MeasurementProfile[];
  measurementTypes: MeasurementType[];
  expenses: Expense[];
  members: WorkshopMember[];
  notifications: Notification[];
  auditLogs: AuditLog[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Supabase Sync Action
  syncWithSupabase: (userId: string, fullName?: string) => Promise<void>;

  // Auth actions
  signIn: (email: string, name: string) => void;
  loginAsDemo: () => void;
  signOut: () => void;
  completeOnboarding: (workshopData: Partial<Workshop>) => Promise<void>;

  // Customer actions
  createCustomer: (input: CreateCustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, input: Partial<CreateCustomerInput>) => Promise<void>;
  archiveCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  getCustomerOrders: (customerId: string) => Order[];

  // Measurement actions
  createMeasurementProfile: (input: CreateMeasurementInput) => Promise<MeasurementProfile>;
  deleteMeasurementProfile: (id: string) => Promise<void>;
  getMeasurementProfiles: (customerId: string) => MeasurementProfile[];
  addMeasurementType: (name: string, unit?: string) => MeasurementType;

  // Order actions
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  changeOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  getOrder: (id: string) => Order | undefined;

  // Payment actions
  createPayment: (input: CreatePaymentInput) => Promise<Payment>;
  getOrderPayments: (orderId: string) => Payment[];

  // Expense actions
  createExpense: (input: Omit<Expense, 'id' | 'workshop_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;

  // Member actions
  inviteMember: (input: { full_name: string; phone?: string; role: UserRole }) => WorkshopMember;
  updateMemberRole: (memberId: string, role: UserRole) => void;
  toggleMemberStatus: (memberId: string) => void;
  removeMember: (memberId: string) => void;

  // Dashboard
  getDashboardStats: () => DashboardStats;
  getRecentActivity: () => RecentActivity[];

  // Utilities
  setError: (error: string | null) => void;
  clearError: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Safe Storage Helper ──────────────────────────────────────
const memoryStorage = new Map<string, string>();
const safeStorage = {
  getItem: (key: string) => (typeof window !== 'undefined' ? window.localStorage.getItem(key) : memoryStorage.get(key) ?? null),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    else memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    else memoryStorage.delete(key);
  },
};

// ─── Store Implementation ─────────────────────────────────────
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      currentUserId: null,
      currentUserName: '',
      currentUserRole: 'OWNER',
      currentWorkshop: null,
      isOnboardingDone: false,

      customers: DEMO_CUSTOMERS,
      orders: DEMO_ORDERS,
      payments: DEMO_PAYMENTS,
      measurementProfiles: DEMO_MEASUREMENT_PROFILES,
      measurementTypes: DEMO_MEASUREMENT_TYPES,
      expenses: DEMO_EXPENSES,
      members: DEMO_MEMBERS,
      notifications: [],
      auditLogs: [],

      isLoading: false,
      error: null,

      // ─── Supabase Full Synchronisation ──────────────────────────
      syncWithSupabase: async (userId: string, fullName?: string) => {
        if (!isSupabaseConfigured) return;

        set({ isLoading: true, error: null });
        try {
          const { workshop, role } = await dbGetOrCreateUserWorkshop(userId, fullName);
          const data = await dbFetchWorkshopFullData(workshop.id);

          set({
            isAuthenticated: true,
            currentUserId: userId,
            currentUserName: fullName || data.workshop.name,
            currentUserRole: (role as UserRole) || 'OWNER',
            currentWorkshop: data.workshop,
            customers: data.customers,
            orders: data.orders,
            payments: data.payments,
            measurementProfiles: data.measurementProfiles,
            measurementTypes: data.measurementTypes.length > 0 ? data.measurementTypes : DEMO_MEASUREMENT_TYPES,
            expenses: data.expenses,
            members: data.members.length > 0 ? data.members : DEMO_MEMBERS,
            notifications: data.notifications,
            isOnboardingDone: true,
            isLoading: false,
          });
        } catch (err: any) {
          console.error('[Store] Sync Supabase Error:', err);
          set({
            isLoading: false,
            error: err?.message || 'Erreur lors de la synchronisation Supabase',
          });
        }
      },

      // ─── Auth ───────────────────────────────────────────────
      loginAsDemo: () => {
        set({
          isAuthenticated: true,
          currentUserId: 'demo-user-001',
          currentUserName: 'Mamadou Diallo',
          currentUserRole: 'OWNER',
          currentWorkshop: DEMO_WORKSHOP,
          isOnboardingDone: true,
          customers: DEMO_CUSTOMERS,
          orders: DEMO_ORDERS,
          payments: DEMO_PAYMENTS,
          measurementProfiles: DEMO_MEASUREMENT_PROFILES,
          measurementTypes: DEMO_MEASUREMENT_TYPES,
          expenses: DEMO_EXPENSES,
          members: DEMO_MEMBERS,
        });
      },

      signIn: (email: string, name: string) => {
        const { currentWorkshop } = get();
        set({
          isAuthenticated: true,
          currentUserId: uid(),
          currentUserName: name || email.split('@')[0],
          currentUserRole: 'OWNER',
          currentWorkshop: currentWorkshop || DEMO_WORKSHOP,
          isOnboardingDone: true,
        });
      },

      signOut: () => {
        signOutUser().catch(() => {});
        set({
          isAuthenticated: false,
          currentUserId: null,
          currentUserName: '',
          currentWorkshop: null,
          isOnboardingDone: false,
          customers: [],
          orders: [],
          payments: [],
          measurementProfiles: [],
          measurementTypes: DEMO_MEASUREMENT_TYPES,
          expenses: [],
          members: [],
        });
      },

      completeOnboarding: async (workshopData: Partial<Workshop>) => {
        const { currentUserId, currentWorkshop } = get();
        const updated: Workshop = {
          ...(currentWorkshop || DEMO_WORKSHOP),
          ...workshopData,
          id: currentWorkshop?.id || uid(),
          owner_id: currentUserId || uid(),
          updated_at: new Date().toISOString(),
        };

        set({
          currentWorkshop: updated,
          isOnboardingDone: true,
        });
      },

      // ─── Customers ──────────────────────────────────────────
      createCustomer: async (input: CreateCustomerInput) => {
        const { currentWorkshop, currentUserId, customers } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const dbCust = await dbCreateCustomer(currentWorkshop.id, input, currentUserId);
          set({ customers: [dbCust, ...customers] });
          return dbCust;
        }

        const localCustomer: Customer = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          full_name: input.full_name.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim(),
          address: input.address?.trim(),
          city: input.city?.trim(),
          gender: input.gender,
          notes: input.notes?.trim(),
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_orders: 0,
          total_spent: 0,
          total_balance: 0,
        };

        set({ customers: [localCustomer, ...customers] });
        return localCustomer;
      },

      updateCustomer: async (id: string, input: Partial<CreateCustomerInput>) => {
        const { currentUserId } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const updated = await dbUpdateCustomer(id, input);
          set((state) => ({
            customers: state.customers.map((c) => (c.id === id ? { ...c, ...updated } : c)),
          }));
          return;
        }

        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c
          ),
        }));
      },

      archiveCustomer: async (id: string) => {
        const { currentUserId } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          await dbDeleteCustomer(id);
        }

        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      getCustomer: (id: string) => {
        const { customers, orders, payments } = get();
        const customer = customers.find((c) => c.id === id);
        if (!customer) return undefined;

        const customerOrders = orders.filter((o) => o.customer_id === id && !o.deleted_at);
        const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const totalPaid = customerOrders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);

        return {
          ...customer,
          total_orders: customerOrders.length,
          total_spent: totalSpent,
          total_balance: Math.max(0, totalSpent - totalPaid),
          last_order_at: customerOrders[0]?.created_at,
        };
      },

      getCustomerOrders: (customerId: string) => {
        return get().orders.filter((o) => o.customer_id === customerId && !o.deleted_at);
      },

      // ─── Measurements ────────────────────────────────────────
      createMeasurementProfile: async (input: CreateMeasurementInput) => {
        const { currentWorkshop, currentUserId, measurementProfiles } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const dbProf = await dbCreateMeasurementProfile(currentWorkshop.id, input);
          set({ measurementProfiles: [dbProf, ...measurementProfiles] });
          return dbProf;
        }

        const localProf: MeasurementProfile = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          customer_id: input.customer_id,
          label: input.label || 'Mesures Standard',
          notes: input.notes,
          fabric_image_url: input.fabric_image_url,
          model_image_url: input.model_image_url,
          fabric_type: input.fabric_type,
          taken_at: new Date().toISOString(),
          taken_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          values: input.values.map((v) => ({
            id: uid(),
            profile_id: '',
            workshop_id: currentWorkshop.id,
            measurement_type_id: v.measurement_type_id,
            value: v.value,
            unit: v.unit,
          })),
        };

        set({ measurementProfiles: [localProf, ...measurementProfiles] });
        return localProf;
      },

      deleteMeasurementProfile: async (id: string) => {
        const { measurementProfiles } = get();
        set({
          measurementProfiles: measurementProfiles.filter((p) => p.id !== id),
        });
      },

      getMeasurementProfiles: (customerId: string) => {
        return get()
          .measurementProfiles.filter((p) => p.customer_id === customerId)
          .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
      },

      addMeasurementType: (name: string, unit: string = 'cm') => {
        const { currentWorkshop, measurementTypes } = get();
        const type: MeasurementType = {
          id: uid(),
          workshop_id: currentWorkshop?.id || 'demo-workshop-001',
          name: name.trim(),
          unit,
          sort_order: measurementTypes.length + 1,
          is_custom: true,
          created_at: new Date().toISOString(),
        };
        set({ measurementTypes: [...measurementTypes, type] });
        return type;
      },

      // ─── Orders ──────────────────────────────────────────────
      createOrder: async (input: CreateOrderInput) => {
        const { currentWorkshop, currentUserId, orders, payments, customers } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const { order, items, initialPayment } = await dbCreateOrder(currentWorkshop.id, input, currentUserId);
          const cust = customers.find((c) => c.id === input.customer_id);
          const enriched: Order = { ...order, customer: cust, items };

          set({
            orders: [enriched, ...orders],
            payments: initialPayment ? [initialPayment, ...payments] : payments,
          });
          return enriched;
        }

        const totalAmount = input.items.reduce((sum, item) => sum + item.unit_price * (item.quantity || 1), 0);
        const paidAmount = input.initial_payment || 0;
        const balance = Math.max(0, totalAmount - paidAmount);
        const orderId = uid();
        const cust = customers.find((c) => c.id === input.customer_id);

        const localOrder: Order = {
          id: orderId,
          workshop_id: currentWorkshop.id,
          customer_id: input.customer_id,
          order_number: generateOrderNumber(2026, orders.length + 1),
          status: 'NEW',
          priority: input.priority,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance: balance,
          order_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: input.due_date,
          assigned_to: input.assigned_to,
          notes: input.notes?.trim(),
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer: cust,
          items: input.items.map((item) => ({
            id: uid(),
            order_id: orderId,
            workshop_id: currentWorkshop.id,
            name: item.name,
            garment_type: item.garment_type,
            fabric: item.fabric,
            color: item.color,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
            created_at: new Date().toISOString(),
          })),
        };

        const newOrders = [localOrder, ...orders];
        let newPayments = payments;

        if (paidAmount > 0) {
          const localPayment: Payment = {
            id: uid(),
            workshop_id: currentWorkshop.id,
            order_id: orderId,
            customer_id: input.customer_id,
            amount: paidAmount,
            method: input.initial_payment_method || input.payment_method || 'CASH',
            status: 'CONFIRMED',
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          newPayments = [localPayment, ...payments];
        }

        set({ orders: newOrders, payments: newPayments });
        return localOrder;
      },

      updateOrder: async (id: string, updates: Partial<Order>) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o)),
        }));
      },

      changeOrderStatus: async (orderId: string, newStatus: OrderStatus, notes?: string) => {
        const { currentUserId } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          await dbUpdateOrderStatus(orderId, newStatus);
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : o
          ),
        }));
      },

      archiveOrder: async (id: string) => {
        const { currentUserId } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          await dbDeleteOrder(id);
        }

        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        }));
      },

      getOrder: (id: string) => {
        const { orders, payments } = get();
        const order = orders.find((o) => o.id === id);
        if (!order) return undefined;

        const orderPayments = payments.filter((p) => p.order_id === id && p.status === 'CONFIRMED');
        const paidAmount = orderPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        return {
          ...order,
          paid_amount: paidAmount,
          balance: Math.max(0, Number(order.total_amount || 0) - paidAmount),
          payments: orderPayments,
          is_late: isDueDateLate(order.due_date, order.status),
        };
      },

      // ─── Payments ────────────────────────────────────────────
      createPayment: async (input: CreatePaymentInput) => {
        const { currentWorkshop, currentUserId, payments, orders } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const { payment, updatedOrder } = await dbCreatePayment(currentWorkshop.id, input, currentUserId);
          set((state) => ({
            payments: [payment, ...state.payments],
            orders: updatedOrder
              ? state.orders.map((o) => (o.id === input.order_id ? { ...o, ...updatedOrder } : o))
              : state.orders,
          }));
          return payment;
        }

        const localPayment: Payment = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          order_id: input.order_id,
          customer_id: input.customer_id,
          amount: input.amount,
          method: input.method || 'CASH',
          status: 'CONFIRMED',
          reference: input.reference,
          notes: input.notes,
          payment_date: input.payment_date || format(new Date(), 'yyyy-MM-dd'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedOrders = orders.map((o) => {
          if (o.id === input.order_id) {
            const newPaid = Number(o.paid_amount || 0) + Number(input.amount);
            const newBalance = Math.max(0, Number(o.total_amount || 0) - newPaid);
            return { ...o, paid_amount: newPaid, balance: newBalance };
          }
          return o;
        });

        set({ payments: [localPayment, ...payments], orders: updatedOrders });
        return localPayment;
      },

      getOrderPayments: (orderId: string) => {
        return get().payments.filter((p) => p.order_id === orderId);
      },

      // ─── Expenses ────────────────────────────────────────────
      createExpense: async (input) => {
        const { currentWorkshop, currentUserId, expenses } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          const dbExp = await dbCreateExpense(currentWorkshop.id, input, currentUserId);
          set({ expenses: [dbExp, ...expenses] });
          return dbExp;
        }

        const localExp: Expense = {
          ...input,
          id: uid(),
          workshop_id: currentWorkshop.id,
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ expenses: [localExp, ...expenses] });
        return localExp;
      },

      deleteExpense: async (id: string) => {
        const { currentUserId, expenses } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== 'demo-user-001') {
          await dbDeleteExpense(id);
        }
        set({ expenses: expenses.filter((e) => e.id !== id) });
      },

      // ─── Members ─────────────────────────────────────────────
      inviteMember: (input) => {
        const { currentWorkshop, members } = get();
        const member: WorkshopMember = {
          id: uid(),
          workshop_id: currentWorkshop?.id || 'demo-workshop-001',
          user_id: uid(),
          role: input.role,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: {
            id: uid(),
            full_name: input.full_name,
            phone: input.phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        set({ members: [...members, member] });
        return member;
      },

      updateMemberRole: (memberId, role) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        }));
      },

      toggleMemberStatus: (memberId) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : m
          ),
        }));
      },

      removeMember: (memberId) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        }));
      },

      // ─── Dashboard Stats ─────────────────────────────────────
      getDashboardStats: () => {
        const { orders, payments, customers } = get();
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        const activeOrders = orders.filter((o) => !o.deleted_at && o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
        const ordersReady = orders.filter((o) => !o.deleted_at && o.status === 'READY').length;
        const ordersLate = activeOrders.filter((o) => isDueDateLate(o.due_date, o.status)).length;

        const paymentsThisMonth = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalOrderAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const balanceToRecover = Math.max(0, totalOrderAmount - paymentsThisMonth);

        return {
          ordersToday: orders.filter((o) => o.order_date === todayStr).length,
          ordersDueToday: orders.filter((o) => o.due_date === todayStr && o.status !== 'DELIVERED').length,
          ordersDueTomorrow: 0,
          ordersLate,
          ordersInProduction: activeOrders.length,
          ordersReady,
          paymentsThisMonth,
          balanceToRecover,
          totalCustomers: customers.filter((c) => !c.deleted_at).length,
          revenueThisMonth: totalOrderAmount,
        };
      },

      getRecentActivity: () => {
        const { orders, payments, customers } = get();
        const activities: RecentActivity[] = [];

        orders.slice(0, 5).forEach((o) => {
          activities.push({
            id: `act-ord-${o.id}`,
            type: 'order_created',
            label: `Nouvelle commande ${o.order_number} (${o.customer?.full_name || 'Client'})`,
            time: format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
            entity_id: o.id,
          });
        });

        payments.slice(0, 5).forEach((p) => {
          activities.push({
            id: `act-pay-${p.id}`,
            type: 'payment_added',
            label: `Paiement ${Number(p.amount).toLocaleString()} FCFA reçu (${p.method})`,
            time: format(new Date(p.payment_date), 'dd/MM/yyyy'),
            entity_id: p.order_id,
          });
        });

        return activities.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
      },

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'atelierpro_app_store_v2',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUserId: state.currentUserId,
        currentUserName: state.currentUserName,
        currentUserRole: state.currentUserRole,
        currentWorkshop: state.currentWorkshop,
        isOnboardingDone: state.isOnboardingDone,
      }),
    }
  )
);
