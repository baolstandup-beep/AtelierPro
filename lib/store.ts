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
  {
    id: 'member-03',
    workshop_id: 'demo-workshop-001',
    user_id: 'demo-user-003',
    role: 'CUTTER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      id: 'demo-user-003',
      full_name: 'Ibrahima Ba',
      phone: '+221 76 345 67 89',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
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
  {
    id: 'exp-02',
    workshop_id: 'demo-workshop-001',
    category: 'FIL',
    description: 'Bobines de fil doré et argenté',
    amount: 12000,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'CASH',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'exp-03',
    workshop_id: 'demo-workshop-001',
    category: 'ELECTRICITE',
    description: 'Facture Senelec atelier',
    amount: 28000,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'ORANGE_MONEY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    full_name: 'Cheikh Ndiaye',
    phone: '+221 78 123 45 67',
    email: 'cheikh.ndiaye@orange.sn',
    city: 'Dakar',
    address: 'Les Almadies, Villa 42',
    notes: 'Costumes sur mesure et tenues traditionnelles chic.',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-003',
    workshop_id: 'demo-workshop-001',
    full_name: 'Mariama Ba',
    phone: '+221 70 987 65 43',
    email: 'mariama.ba@yahoo.fr',
    city: 'Dakar',
    address: 'Mermoz Pyrotechnie',
    notes: 'Robes de soirée et tenues de cérémonie.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-004',
    workshop_id: 'demo-workshop-001',
    full_name: 'Ousmane Sow',
    phone: '+221 76 543 21 09',
    email: 'ousmane.sow@gmail.com',
    city: 'Dakar',
    address: 'Médina, Rue 6',
    notes: 'Kaftans brodés et tenues vendredi.',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-005',
    workshop_id: 'demo-workshop-001',
    full_name: 'Aminata Traoré',
    phone: '+221 77 890 12 34',
    email: 'aminata.traore@gmail.com',
    city: 'Dakar',
    address: 'Sacré-Cœur 3',
    notes: 'Tailleur moderne et robes wax.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
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
    total_amount: 120000,
    paid_amount: 80000,
    balance: 40000,
    order_date: format(new Date(Date.now() - 4 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 3 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'member-02',
    notes: 'Grand Boubou Bazin Riche Getzner 3 pièces broderie fil d\'or',
    items: [
      {
        id: 'item-01',
        order_id: 'ord-001',
        workshop_id: 'demo-workshop-001',
        name: 'Grand Boubou 3 pièces',
        garment_type: 'BOUBOU',
        fabric: 'Bazin Riche Getzner',
        quantity: 1,
        unit_price: 120000,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ord-002',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-002',
    order_number: 'CMD-2026-002',
    status: 'READY',
    priority: 'HIGH',
    total_amount: 180000,
    paid_amount: 180000,
    balance: 0,
    order_date: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 1 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'member-03',
    notes: 'Costume 3 pièces lin italien & doublure soie',
    items: [
      {
        id: 'item-02',
        order_id: 'ord-002',
        workshop_id: 'demo-workshop-001',
        name: 'Costume 3 pièces lin',
        garment_type: 'COSTUME',
        fabric: 'Lin Italien',
        quantity: 1,
        unit_price: 180000,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ord-003',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-003',
    order_number: 'CMD-2026-003',
    status: 'CUTTING',
    priority: 'NORMAL',
    total_amount: 95000,
    paid_amount: 50000,
    balance: 45000,
    order_date: format(new Date(Date.now() - 2 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 5 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'member-02',
    notes: 'Robe de soirée drapée en soie sauvage',
    items: [
      {
        id: 'item-03',
        order_id: 'ord-003',
        workshop_id: 'demo-workshop-001',
        name: 'Robe de soirée drapée',
        garment_type: 'ROBE',
        fabric: 'Soie sauvage',
        quantity: 1,
        unit_price: 95000,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ord-004',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-004',
    order_number: 'CMD-2026-004',
    status: 'MEASURED',
    priority: 'NORMAL',
    total_amount: 65000,
    paid_amount: 30000,
    balance: 35000,
    order_date: format(new Date(Date.now() - 1 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 8 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'member-03',
    notes: 'Ensemble Kaftan moderne col officier',
    items: [
      {
        id: 'item-04',
        order_id: 'ord-004',
        workshop_id: 'demo-workshop-001',
        name: 'Ensemble Kaftan moderne',
        garment_type: 'KAFTAN',
        fabric: 'Coton glacé',
        quantity: 1,
        unit_price: 65000,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ord-005',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-005',
    order_number: 'CMD-2026-005',
    status: 'DELIVERED',
    priority: 'NORMAL',
    total_amount: 85000,
    paid_amount: 85000,
    balance: 0,
    order_date: format(new Date(Date.now() - 12 * 86400000), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() - 2 * 86400000), 'yyyy-MM-dd'),
    assigned_to: 'member-02',
    notes: 'Tailleur pantalon wax Woodin & veste cintrée',
    items: [
      {
        id: 'item-05',
        order_id: 'ord-005',
        workshop_id: 'demo-workshop-001',
        name: 'Tailleur pantalon wax',
        garment_type: 'ENSEMBLE',
        fabric: 'Wax Woodin',
        quantity: 1,
        unit_price: 85000,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-001',
    customer_id: 'cust-001',
    amount: 80000,
    method: 'WAVE',
    payment_date: format(new Date(Date.now() - 4 * 86400000), 'yyyy-MM-dd'),
    reference: 'WAVE-TX-99882',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pay-002',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-002',
    customer_id: 'cust-002',
    amount: 180000,
    method: 'ORANGE_MONEY',
    payment_date: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'),
    reference: 'OM-SN-77341',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pay-003',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-003',
    customer_id: 'cust-003',
    amount: 50000,
    method: 'WAVE',
    payment_date: format(new Date(Date.now() - 2 * 86400000), 'yyyy-MM-dd'),
    reference: 'WAVE-TX-10294',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pay-004',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-004',
    customer_id: 'cust-004',
    amount: 30000,
    method: 'CASH',
    payment_date: format(new Date(Date.now() - 1 * 86400000), 'yyyy-MM-dd'),
    reference: 'RECU-004',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pay-005',
    workshop_id: 'demo-workshop-001',
    order_id: 'ord-005',
    customer_id: 'cust-005',
    amount: 85000,
    method: 'WAVE',
    payment_date: format(new Date(Date.now() - 12 * 86400000), 'yyyy-MM-dd'),
    reference: 'WAVE-TX-88219',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_MEASUREMENT_PROFILES: MeasurementProfile[] = [
  {
    id: 'prof-001',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-001',
    label: 'Mesures Grand Boubou Festif',
    notes: 'Coupe ample traditionnelle',
    fabric_type: 'Bazin Riche',
    taken_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    values: [
      { id: 'v1', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-01', value: 42, unit: 'cm' },
      { id: 'v2', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-02', value: 48, unit: 'cm' },
      { id: 'v3', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-03', value: 104, unit: 'cm' },
      { id: 'v4', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-07', value: 65, unit: 'cm' },
      { id: 'v5', profile_id: 'prof-001', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-09', value: 145, unit: 'cm' },
    ],
  },
  {
    id: 'prof-002',
    workshop_id: 'demo-workshop-001',
    customer_id: 'cust-002',
    label: 'Mesures Costume 3 pièces',
    notes: 'Coupe ajustée italienne',
    fabric_type: 'Lin & Soie',
    taken_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    values: [
      { id: 'v6', profile_id: 'prof-002', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-02', value: 46, unit: 'cm' },
      { id: 'v7', profile_id: 'prof-002', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-03', value: 98, unit: 'cm' },
      { id: 'v8', profile_id: 'prof-002', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-04', value: 84, unit: 'cm' },
      { id: 'v9', profile_id: 'prof-002', workshop_id: 'demo-workshop-001', measurement_type_id: 'mt-10', value: 106, unit: 'cm' },
    ],
  },
];

// ─── Store interface ──────────────────────────────────────────
interface AppStore {
  // Auth state (demo)
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

  // Auth actions
  signIn: (email: string, name: string) => void;
  loginAsDemo: () => void;
  signOut: () => void;
  completeOnboarding: (workshopData: Partial<Workshop>) => void;

  // Customer actions
  createCustomer: (input: CreateCustomerInput) => Customer;
  updateCustomer: (id: string, input: Partial<CreateCustomerInput>) => void;
  archiveCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  getCustomerOrders: (customerId: string) => Order[];

  // Measurement actions
  createMeasurementProfile: (input: CreateMeasurementInput) => MeasurementProfile;
  deleteMeasurementProfile: (id: string) => void;
  getMeasurementProfiles: (customerId: string) => MeasurementProfile[];
  addMeasurementType: (name: string, unit?: string) => MeasurementType;

  // Order actions
  createOrder: (input: CreateOrderInput) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  changeOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => void;
  archiveOrder: (id: string) => void;
  getOrder: (id: string) => Order | undefined;

  // Payment actions
  createPayment: (input: CreatePaymentInput) => Payment;
  getOrderPayments: (orderId: string) => Payment[];

  // Expense actions
  createExpense: (input: Omit<Expense, 'id' | 'workshop_id' | 'created_by' | 'created_at' | 'updated_at'>) => Expense;
  deleteExpense: (id: string) => void;

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

// ─── UUID generator ───────────────────────────────────────────
// ─── Safe Storage (Browser localStorage + Node/SSR Memory fallback)
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

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Store ────────────────────────────────────────────────────
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial auth state
      isAuthenticated: false,
      currentUserId: null,
      currentUserName: '',
      currentUserRole: 'OWNER',
      currentWorkshop: null,
      isOnboardingDone: false,

      // Initial data
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
        });
      },

      completeOnboarding: (workshopData: Partial<Workshop>) => {
        const workshop: Workshop = {
          ...DEMO_WORKSHOP,
          ...workshopData,
          id: uid(),
          owner_id: get().currentUserId || uid(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        // Update measurement types to new workshop_id
        const types = DEMO_MEASUREMENT_TYPES.map(t => ({ ...t, workshop_id: workshop.id }));
        set({
          currentWorkshop: workshop,
          isOnboardingDone: true,
          measurementTypes: types,
        });
      },

      // ─── Customers ──────────────────────────────────────────
      createCustomer: (input: CreateCustomerInput) => {
        const { currentWorkshop, currentUserId, customers } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const customer: Customer = {
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

        set({ customers: [customer, ...customers] });
        addAuditLogInternal('CUSTOMER_CREATED', 'customer', customer.id, { name: customer.full_name });
        return customer;
      },

      updateCustomer: (id: string, input: Partial<CreateCustomerInput>) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, ...input, updated_at: new Date().toISOString() }
              : c
          ),
        }));
        addAuditLogInternal('CUSTOMER_UPDATED', 'customer', id);
      },

      archiveCustomer: (id: string) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              : c
          ),
        }));
        addAuditLogInternal('CUSTOMER_ARCHIVED', 'customer', id);
      },

      getCustomer: (id: string) => {
        const { customers, orders, payments } = get();
        const customer = customers.find((c) => c.id === id);
        if (!customer) return undefined;

        const customerOrders = orders.filter((o) => o.customer_id === id && !o.deleted_at);
        const totalSpent = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);
        const totalPaid = customerOrders.reduce((sum, o) => sum + o.paid_amount, 0);

        return {
          ...customer,
          total_orders: customerOrders.length,
          total_spent: totalSpent,
          total_balance: totalSpent - totalPaid,
          last_order_at: customerOrders[0]?.created_at,
        };
      },

      getCustomerOrders: (customerId: string) => {
        return get().orders.filter((o) => o.customer_id === customerId && !o.deleted_at);
      },

      // ─── Measurements ────────────────────────────────────────
      createMeasurementProfile: (input: CreateMeasurementInput) => {
        const { currentWorkshop, currentUserId, measurementProfiles, measurementTypes, customers } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const types = measurementTypes;
        const profile: MeasurementProfile = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          customer_id: input.customer_id,
          label: input.label,
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
            measurement_type: types.find((t) => t.id === v.measurement_type_id),
          })),
        };
        profile.values = profile.values!.map((v) => ({ ...v, profile_id: profile.id }));

        set({ measurementProfiles: [profile, ...measurementProfiles] });
        addAuditLogInternal('MEASUREMENT_CREATED', 'measurement_profile', profile.id);
        return profile;
      },

      deleteMeasurementProfile: (id: string) => {
        const { measurementProfiles } = get();
        set({
          measurementProfiles: measurementProfiles.filter((p) => p.id !== id),
        });
        addAuditLogInternal('MEASUREMENT_DELETED', 'measurement_profile', id);
      },

      getMeasurementProfiles: (customerId: string) => {
        return get().measurementProfiles
          .filter((p) => p.customer_id === customerId)
          .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
      },

      addMeasurementType: (name: string, unit: string = 'cm') => {
        const { currentWorkshop, measurementTypes } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

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
      createOrder: (input: CreateOrderInput) => {
        const { currentWorkshop, currentUserId, orders, customers, payments } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const customer = customers.find((c) => c.id === input.customer_id);
        if (!customer) throw new Error('Client introuvable');
        if (customer.workshop_id !== currentWorkshop.id) {
          throw new Error('Violation de sécurité : le client n\'appartient pas à cet atelier.');
        }

        // Generate order number
        const year = new Date().getFullYear();
        const yearOrders = orders.filter((o) => o.order_number.includes(`CMD-${year}`));
        const sequence = yearOrders.length + 1;
        const orderNumber = generateOrderNumber(year, sequence);

        // Calculate total
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0
        );

        const orderId = uid();
        const order: Order = {
          id: orderId,
          workshop_id: currentWorkshop.id,
          customer_id: input.customer_id,
          order_number: orderNumber,
          status: 'NEW',
          priority: input.priority,
          total_amount: totalAmount,
          paid_amount: 0,
          balance: totalAmount,
          order_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: input.due_date,
          assigned_to: input.assigned_to,
          notes: input.notes?.trim(),
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer,
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
          status_history: [{
            id: uid(),
            order_id: orderId,
            workshop_id: currentWorkshop.id,
            old_status: undefined,
            new_status: 'NEW',
            changed_by: currentUserId || undefined,
            changed_at: new Date().toISOString(),
            notes: 'Commande créée',
          }],
          payments: [],
          is_late: false,
        };

        const newOrders = [order, ...orders];
        set({ orders: newOrders });

        // Add initial payment if provided
        if (input.initial_payment && input.initial_payment > 0) {
          get().createPayment({
            order_id: orderId,
            customer_id: input.customer_id,
            amount: input.initial_payment,
            method: input.initial_payment_method || input.payment_method || 'CASH',
            payment_date: format(new Date(), 'yyyy-MM-dd'),
          });
        }

        addAuditLogInternal('ORDER_CREATED', 'order', orderId, { order_number: orderNumber });
        return get().orders.find((o) => o.id === orderId) || order;
      },

      updateOrder: (id: string, updates: Partial<Order>) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { ...o, ...updates, updated_at: new Date().toISOString() }
              : o
          ),
        }));
        addAuditLogInternal('ORDER_UPDATED', 'order', id);
      },

      changeOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => {
        const { orders, currentUserId, currentWorkshop } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        const historyEntry = {
          id: uid(),
          order_id: orderId,
          workshop_id: currentWorkshop?.id || '',
          old_status: order.status,
          new_status: newStatus,
          changed_by: currentUserId || undefined,
          changed_at: new Date().toISOString(),
          notes,
        };

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                  status_history: [...(o.status_history || []), historyEntry],
                }
              : o
          ),
        }));

        addAuditLogInternal('ORDER_STATUS_CHANGED', 'order', orderId, {
          old_status: order.status,
          new_status: newStatus,
        });
      },

      archiveOrder: (id: string) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { ...o, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              : o
          ),
        }));
        addAuditLogInternal('ORDER_ARCHIVED', 'order', id);
      },

      getOrder: (id: string) => {
        const { orders, payments } = get();
        const order = orders.find((o) => o.id === id);
        if (!order) return undefined;

        const orderPayments = payments.filter((p) => p.order_id === id && p.status === 'CONFIRMED');
        const paidAmount = orderPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
          ...order,
          paid_amount: paidAmount,
          balance: Math.max(0, order.total_amount - paidAmount),
          payments: orderPayments,
          is_late: isDueDateLate(order.due_date, order.status),
        };
      },

      // ─── Payments ────────────────────────────────────────────
      createPayment: (input: CreatePaymentInput) => {
        const { currentWorkshop, currentUserId, payments, orders } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const order = orders.find((o) => o.id === input.order_id);
        if (!order) throw new Error('Commande introuvable');
        if (order.workshop_id !== currentWorkshop.id) {
          throw new Error('Violation de sécurité : la commande n\'appartient pas à cet atelier.');
        }
        if (order.customer_id !== input.customer_id) {
          throw new Error('Violation d\'intégrité : le client ne correspond pas à la commande.');
        }

        // Validate amount
        const currentPaid = payments
          .filter((p) => p.order_id === input.order_id && p.status === 'CONFIRMED')
          .reduce((sum, p) => sum + p.amount, 0);
        const remaining = order.total_amount - currentPaid;

        if (input.amount <= 0) throw new Error('Le montant doit être supérieur à 0');
        if (input.amount > remaining + 0.01) {
          throw new Error(`Le montant saisi (${input.amount}) dépasse le reste à payer (${remaining})`);
        }

        const payment: Payment = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          order_id: input.order_id,
          customer_id: input.customer_id,
          amount: input.amount,
          method: input.method,
          status: 'CONFIRMED',
          reference: input.reference,
          notes: input.notes,
          payment_date: input.payment_date,
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newPayments = [payment, ...payments];
        const newPaid = newPayments
          .filter((p) => p.order_id === input.order_id && p.status === 'CONFIRMED')
          .reduce((sum, p) => sum + p.amount, 0);

        set((state) => ({
          payments: newPayments,
          orders: state.orders.map((o) =>
            o.id === input.order_id
              ? { ...o, paid_amount: newPaid, balance: Math.max(0, o.total_amount - newPaid) }
              : o
          ),
        }));

        addAuditLogInternal('PAYMENT_CREATED', 'payment', payment.id, { amount: payment.amount });
        return payment;
      },

      getOrderPayments: (orderId: string) => {
        return get().payments.filter((p) => p.order_id === orderId);
      },

      // ─── Expenses ────────────────────────────────────────────
      createExpense: (input) => {
        const { currentWorkshop, currentUserId, expenses } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const expense: Expense = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          created_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...input,
        };

        set({ expenses: [expense, ...expenses] });
        return expense;
      },

      deleteExpense: (id: string) => {
        set({ expenses: get().expenses.filter((e) => e.id !== id) });
      },

      // ─── Team / Members ──────────────────────────────────────
      inviteMember: (input: { full_name: string; phone?: string; role: UserRole }) => {
        const { currentWorkshop, currentUserId, members } = get();
        if (!currentWorkshop) throw new Error('Aucun atelier sélectionné');

        const newUserId = uid();
        const newMember: WorkshopMember = {
          id: uid(),
          workshop_id: currentWorkshop.id,
          user_id: newUserId,
          role: input.role,
          status: 'ACTIVE',
          invited_by: currentUserId || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: {
            id: newUserId,
            full_name: input.full_name,
            phone: input.phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        set({ members: [...members, newMember] });
        addAuditLogInternal('MEMBER_INVITED', 'member', newMember.id, {
          name: input.full_name,
          role: input.role,
        });
        return newMember;
      },

      updateMemberRole: (memberId: string, role: UserRole) => {
        const { members } = get();
        set({
          members: members.map((m) =>
            m.id === memberId ? { ...m, role, updated_at: new Date().toISOString() } : m
          ),
        });
        addAuditLogInternal('MEMBER_ROLE_CHANGED', 'member', memberId, { role });
      },

      toggleMemberStatus: (memberId: string) => {
        const { members } = get();
        set({
          members: members.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  updated_at: new Date().toISOString(),
                }
              : m
          ),
        });
      },

      removeMember: (memberId: string) => {
        const { members } = get();
        set({ members: members.filter((m) => m.id !== memberId) });
        addAuditLogInternal('MEMBER_REMOVED', 'member', memberId);
      },

      // ─── Dashboard ───────────────────────────────────────────
      getDashboardStats: (): DashboardStats => {
        const { orders, payments, customers } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

        const activeOrders = orders.filter((o) => !o.deleted_at && o.status !== 'CANCELLED');

        return {
          ordersToday: activeOrders.filter((o) => o.order_date === today).length,
          ordersDueToday: activeOrders.filter((o) => o.due_date === today && o.status !== 'DELIVERED').length,
          ordersDueTomorrow: activeOrders.filter((o) => o.due_date === tomorrow && o.status !== 'DELIVERED').length,
          ordersLate: activeOrders.filter((o) => isDueDateLate(o.due_date, o.status)).length,
          ordersInProduction: activeOrders.filter((o) => ['CUTTING', 'SEWING', 'FINISHING', 'MEASURED'].includes(o.status)).length,
          ordersReady: activeOrders.filter((o) => o.status === 'READY').length,
          paymentsThisMonth: payments
            .filter((p) => p.payment_date >= monthStart && p.status === 'CONFIRMED')
            .reduce((sum, p) => sum + p.amount, 0),
          balanceToRecover: activeOrders
            .filter((o) => o.status !== 'DELIVERED')
            .reduce((sum, o) => sum + (o.balance || 0), 0),
          totalCustomers: customers.filter((c) => !c.deleted_at).length,
          revenueThisMonth: payments
            .filter((p) => p.payment_date >= monthStart && p.status === 'CONFIRMED')
            .reduce((sum, p) => sum + p.amount, 0),
        };
      },

      getRecentActivity: (): RecentActivity[] => {
        const { auditLogs } = get();
        return auditLogs.slice(0, 15).map((log) => ({
          id: log.id,
          type: (log.action.toLowerCase().replace('_', '_') as RecentActivity['type']) || 'order_created',
          label: formatAuditLabel(log),
          time: log.created_at,
          entity_id: log.entity_id,
        }));
      },

      // ─── Utilities ───────────────────────────────────────────
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'atelierpro-store',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUserId: state.currentUserId,
        currentUserName: state.currentUserName,
        currentUserRole: state.currentUserRole,
        currentWorkshop: state.currentWorkshop,
        isOnboardingDone: state.isOnboardingDone,
        customers: state.customers,
        orders: state.orders,
        payments: state.payments,
        measurementProfiles: state.measurementProfiles,
        measurementTypes: state.measurementTypes,
        expenses: state.expenses,
        members: state.members,
        auditLogs: state.auditLogs,
      }),
    }
  )
);

// ─── Internal audit log helper (called within store actions) ──
function addAuditLogInternal(
  action: string,
  entityType: string,
  entityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
) {
  const { currentWorkshop, currentUserId, auditLogs } = useAppStore.getState();
  const log: AuditLog = {
    id: Math.random().toString(36).slice(2),
    workshop_id: currentWorkshop?.id,
    user_id: currentUserId || undefined,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    created_at: new Date().toISOString(),
  };
  useAppStore.setState({ auditLogs: [log, ...auditLogs].slice(0, 200) });
}

function formatAuditLabel(log: AuditLog): string {
  const labels: Record<string, string> = {
    CUSTOMER_CREATED: 'Nouveau client créé',
    CUSTOMER_UPDATED: 'Client modifié',
    CUSTOMER_ARCHIVED: 'Client archivé',
    ORDER_CREATED: `Commande ${(log.metadata as {order_number?: string})?.order_number || ''} créée`,
    ORDER_UPDATED: 'Commande modifiée',
    ORDER_STATUS_CHANGED: `Statut mis à jour → ${(log.metadata as {new_status?: string})?.new_status || ''}`,
    ORDER_DELIVERED: 'Commande livrée',
    PAYMENT_CREATED: `Paiement de ${(log.metadata as {amount?: number})?.amount?.toLocaleString('fr-FR') || ''} FCFA enregistré`,
    MEASUREMENT_CREATED: 'Mesures enregistrées',
  };
  return labels[log.action] || log.action;
}
