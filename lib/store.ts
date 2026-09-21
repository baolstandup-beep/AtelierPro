'use client';

import { create } from 'zustand';
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
  dbUpdateOrder,
  dbDeleteOrder,
  dbCreatePayment,
  dbCreateMeasurementProfile,
  dbDeleteMeasurementProfile,
  dbCreateExpense,
  dbDeleteExpense,
  dbInviteMember,
  dbUpdateMemberRole,
  dbToggleMemberStatus,
  dbRemoveMember,
} from './supabase-api';


// ─── No Demo data ────────────────────────────────────────────────

// ─── Store interface ──────────────────────────────────────────
export interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  isAuthInitialized: boolean;
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

  signOut: () => Promise<void>;
  clearSession: () => void;
  setAuthInitialized: (initialized: boolean) => void;
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

// ─── Default Measurement Types Fallback ─────────────────────────
const DEFAULT_MEASUREMENT_NAMES = [
  'Tour de cou', 'Épaule', 'Poitrine', 'Longueur boubou', 'Longueur chemise',
  'Longueur veste', 'Longueur robe', 'Longueur manches', 'Tour de bras',
  'Tour de poignet', 'Taille', 'Bassin', 'Hanche', 'Tour de ceinture',
  'Longueur pantalon', 'Cuisse', 'Genou', 'Bas de pantalon'
];

function getDefaultMeasurementTypes(workshopId: string): MeasurementType[] {
  return DEFAULT_MEASUREMENT_NAMES.map((name, index) => ({
    id: `default-meas-${index}`,
    workshop_id: workshopId,
    name,
    unit: 'cm',
    sort_order: index + 1,
    is_custom: false,
    created_at: new Date().toISOString(),
  }));
}

// ─── Store Implementation ─────────────────────────────────────
export const useAppStore = create<AppStore>()(
  (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isAuthInitialized: false,
      currentUserId: null,
      currentUserName: '',
      currentUserRole: 'OWNER',
      currentWorkshop: null,
      isOnboardingDone: false,

      customers: [],
      orders: [],
      payments: [],
      measurementProfiles: [],
      measurementTypes: [],  // Sera peuplé par syncWithSupabase avec l'ID réel de l'atelier
      expenses: [],
      members: [],
      notifications: [],
      auditLogs: [],

      isLoading: false,
      error: null,

      // ─── Supabase Full Synchronisation ──────────────────────────
      syncWithSupabase: async (userId: string, fullName?: string) => {
        if (!isSupabaseConfigured) return;

        // Clear existing data to prevent leaking previous tenant state while loading
        set({
          isLoading: true,
          error: null,
          currentUserId: userId,
          currentWorkshop: null,
          customers: [],
          orders: [],
          payments: [],
          measurementProfiles: [],
          expenses: [],
          members: [],
          notifications: [],
        });
        
        try {
          const { workshop, role } = await dbGetOrCreateUserWorkshop(userId, fullName);
          const data = await dbFetchWorkshopFullData(workshop.id);

          set({
            isAuthenticated: true,
            isAuthInitialized: true,
            currentUserId: userId,
            currentUserName: fullName || data.workshop.name,
            currentUserRole: (role as UserRole) || 'OWNER',
            currentWorkshop: data.workshop,
            customers: data.customers,
            orders: data.orders,
            payments: data.payments,
            measurementProfiles: data.measurementProfiles,
            measurementTypes: data.measurementTypes.length > 0 ? data.measurementTypes : getDefaultMeasurementTypes(data.workshop.id),
            expenses: data.expenses,
            members: data.members.length > 0 ? data.members : [],
            notifications: data.notifications,
            isOnboardingDone: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          console.error('[Store] Sync Supabase Error:', err);
          const message = err instanceof Error ? err.message : 'Erreur inconnue';
          const errorMessage = message.includes('ATELIER_NOT_FOUND') || message.includes('TIMEOUT')
            ? `Impossible de charger votre atelier. ${message}. Veuillez rafraîchir la page.`
            : `Erreur lors de la synchronisation : ${message}`;
          set({
            isLoading: false,
            isAuthInitialized: true,
            error: errorMessage,
          });
        }
      },



      signIn: (email: string, name: string) => {
        const { currentWorkshop } = get();
        set({
          isAuthenticated: true,
          currentUserId: uid(),
          currentUserName: name || email.split('@')[0],
          currentUserRole: 'OWNER',
          currentWorkshop: currentWorkshop || null,
          isOnboardingDone: true,
        });
      },

      signOut: async () => {
        try {
          await signOutUser();
        } catch (error) {
          console.error('[Store] Supabase sign-out failed:', error);
        }
        get().clearSession();
      },

      clearSession: () => {
        // S'assurer que le stockage local est entièrement vidé
        if (typeof window !== 'undefined') {
          window.localStorage.clear();
          window.sessionStorage.clear();
        }
        memoryStorage.clear();

        set({
          isAuthenticated: false,
          isAuthInitialized: true,
          currentUserId: null,
          currentUserName: '',
          currentUserRole: 'OWNER',
          currentWorkshop: null,
          isOnboardingDone: false,
          customers: [],
          orders: [],
          payments: [],
          measurementProfiles: [],
          measurementTypes: [],  // Réinitialisé vide — sera rechargé par syncWithSupabase
          expenses: [],
          members: [],
          notifications: [],
          auditLogs: [],
          isLoading: false,
          error: null,
        });
      },

      setAuthInitialized: (initialized: boolean) => set({ isAuthInitialized: initialized }),

      completeOnboarding: async (workshopData: Partial<Workshop>) => {
        const { currentUserId, currentWorkshop } = get();
        const updated = {
          ...(currentWorkshop || {}),
          ...workshopData,
          id: currentWorkshop?.id || uid(),
          owner_id: currentUserId || uid(),
          updated_at: new Date().toISOString(),
        } as Workshop;

        set({
          currentWorkshop: updated,
          isOnboardingDone: true,
        });
      },

      // ─── Customers ──────────────────────────────────────────
      createCustomer: async (input: CreateCustomerInput) => {
        const { currentWorkshop, currentUserId, customers } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
          await dbDeleteCustomer(id);
        }

        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      getCustomer: (id: string) => {
        const { customers, orders, payments } = get();
        const customer = customers.find((c) => c.id === id);
        if (!customer || customer.deleted_at) return undefined;

        const customerOrders = orders.filter((o) => o.customer_id === id && !o.deleted_at);
        const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const totalPaid = customerOrders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
        const totalBalance = customerOrders.reduce((sum, o) => {
          const paid = payments
            .filter((p) => p.order_id === o.id && p.status === 'CONFIRMED')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          return sum + Math.max(0, Number(o.total_amount || 0) - paid);
        }, 0);

        const legacyCustomer = customer as Customer & { name?: string; atelier_id?: string };
        return {
          ...customer,
          full_name: customer.full_name || legacyCustomer.name || 'Client',
          workshop_id: customer.workshop_id || legacyCustomer.atelier_id || '',
          total_orders: customerOrders.length,
          total_spent: totalSpent,
          total_paid: totalPaid,
          total_balance: totalBalance,
          last_order_at: customerOrders.length > 0 ? customerOrders[0].created_at : customer.created_at,
        };
      },

      getCustomerOrders: (customerId: string) => {
        return get().orders.filter((o) => o.customer_id === customerId && !o.deleted_at);
      },

      // ─── Measurements ────────────────────────────────────────
      createMeasurementProfile: async (input: CreateMeasurementInput) => {
        const { currentWorkshop, currentUserId, measurementProfiles } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        const { measurementProfiles, currentUserId } = get();
        // Optimistic update local immédiat
        set({
          measurementProfiles: measurementProfiles.filter((p) => p.id !== id),
        });
        // Persistance Supabase
        if (isSupabaseConfigured && currentUserId) {
          try {
            await dbDeleteMeasurementProfile(id);
          } catch (err) {
            console.error('[deleteMeasurementProfile] Erreur de persistance Supabase:', err);
            // Restauration en cas d'erreur
            set({ measurementProfiles });
          }
        }
      },

      getMeasurementProfiles: (customerId: string) => {
        return get()
          .measurementProfiles.filter((p) => p.customer_id === customerId)
          .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
      },

      addMeasurementType: (name: string, unit: string = 'cm') => {
        const { currentWorkshop, measurementTypes } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier chargé — impossible d\'ajouter un type de mesure');
        const type: MeasurementType = {
          id: uid(),
          workshop_id: currentWorkshop.id,
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

        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        const { currentUserId } = get();
        // Optimistic update local immédiat
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o)),
        }));
        // Persistance Supabase
        if (isSupabaseConfigured && currentUserId) {
          try {
            const savedOrder = await dbUpdateOrder(id, {
              status: updates.status,
              due_date: updates.due_date,
              notes: updates.notes,
              priority: updates.priority,
            });
            // Mise à jour avec les données réelles de la DB (incluant balance recalculé)
            set((state) => ({
              orders: state.orders.map((o) => (o.id === id ? { ...o, ...savedOrder } : o)),
            }));
          } catch (err) {
            console.error('[updateOrder] Erreur de persistance Supabase:', err);
          }
        }
      },


      changeOrderStatus: async (orderId: string, newStatus: OrderStatus, notes?: string) => {
        const { currentUserId } = get();
        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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

        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
          status: (input.method === 'WAVE' || input.method === 'ORANGE_MONEY') ? 'PENDING' : 'CONFIRMED',
          reference: input.reference,
          notes: input.notes,
          payment_date: input.payment_date || format(new Date(), 'yyyy-MM-dd'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedOrders = orders.map((o) => {
          if (o.id === input.order_id && localPayment.status === 'CONFIRMED') {
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

        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
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
        if (isSupabaseConfigured && currentUserId && currentUserId !== null) {
          await dbDeleteExpense(id);
        }
        set({ expenses: expenses.filter((e) => e.id !== id) });
      },

      // ─── Members ─────────────────────────────────────────────
      inviteMember: (input) => {
        const { currentWorkshop, currentUserId, members } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const member: WorkshopMember = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          user_id: uid(), // ID provisoire — sera résolu lors du prochain sync
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
        // Note: La persistance réelle de l'invitation nécessite de connaître l'userId Supabase
        // du nouveau membre. Cela doit passer par un Server Action (recherche par téléphone → userId)
        // Pour l'instant, le store est mis à jour localement en attendant le prochain sync.
        return member;
      },

      updateMemberRole: async (memberId, role) => {
        const { currentWorkshop } = get();
        set((state) => ({
          members: state.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        }));
        if (isSupabaseConfigured && currentWorkshop) {
          const member = get().members.find((m) => m.id === memberId);
          if (member?.user_id) {
            try {
              await dbUpdateMemberRole(currentWorkshop.id, member.user_id, role);
            } catch (err) {
              console.error('[updateMemberRole] Erreur Supabase:', err);
            }
          }
        }
      },

      toggleMemberStatus: async (memberId) => {
        const { currentWorkshop } = get();
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : m
          ),
        }));
        if (isSupabaseConfigured && currentWorkshop) {
          const member = get().members.find((m) => m.id === memberId);
          if (member?.user_id) {
            const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            try {
              await dbToggleMemberStatus(currentWorkshop.id, member.user_id, newStatus as 'ACTIVE' | 'INACTIVE');
            } catch (err) {
              console.error('[toggleMemberStatus] Erreur Supabase:', err);
            }
          }
        }
      },

      removeMember: async (memberId) => {
        const { currentWorkshop } = get();
        const member = get().members.find((m) => m.id === memberId);
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        }));
        if (isSupabaseConfigured && currentWorkshop && member?.user_id) {
          try {
            await dbRemoveMember(currentWorkshop.id, member.user_id);
          } catch (err) {
            console.error('[removeMember] Erreur Supabase:', err);
          }
        }
      },


      // ─── Dashboard Stats ─────────────────────────────────────
      getDashboardStats: () => {
        const { orders, payments, customers } = get();
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        // Calcul de la date de demain (YYYY-MM-DD)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

        // Calcul du début du mois courant
        const startOfMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');

        const activeOrders = orders.filter((o) => !o.deleted_at && o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
        const ordersReady = orders.filter((o) => !o.deleted_at && o.status === 'READY').length;
        const ordersLate = activeOrders.filter((o) => isDueDateLate(o.due_date, o.status)).length;

        // Paiements du mois courant uniquement (status CONFIRMED)
        const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED');
        const paymentsThisMonth = confirmedPayments
          .filter((p) => (p.payment_date || '') >= startOfMonth)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // Revenue ce mois = total des paiements confirmés du mois (pas les commandes)
        const revenueThisMonth = paymentsThisMonth;

        // Balance à récupérer = sum des soldes non payés sur commandes actives
        const balanceToRecover = activeOrders.reduce((sum, o) => {
          const paid = confirmedPayments
            .filter((p) => p.order_id === o.id)
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          return sum + Math.max(0, Number(o.total_amount || 0) - paid);
        }, 0);

        return {
          ordersToday: orders.filter((o) => !o.deleted_at && o.order_date === todayStr).length,
          ordersDueToday: orders.filter((o) => !o.deleted_at && o.due_date === todayStr && o.status !== 'DELIVERED').length,
          ordersDueTomorrow: orders.filter((o) => !o.deleted_at && o.due_date === tomorrowStr && o.status !== 'DELIVERED').length,
          ordersLate,
          ordersInProduction: activeOrders.length,
          ordersReady,
          paymentsThisMonth,
          balanceToRecover,
          totalCustomers: customers.filter((c) => !c.deleted_at).length,
          revenueThisMonth,
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
  })
);
