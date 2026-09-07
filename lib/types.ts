export type UserRole = 'OWNER' | 'MANAGER' | 'TAILOR' | 'CUTTER' | 'CASHIER' | 'EMPLOYEE';

export type OrderStatus =
  | 'NEW'
  | 'MEASURED'
  | 'CUTTING'
  | 'SEWING'
  | 'FINISHING'
  | 'READY'
  | 'DELIVERED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'WAVE' | 'ORANGE_MONEY' | 'BANK' | 'STRIPE' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type GarmentType = 'BOUBOU' | 'KAFTAN' | 'CHEMISE' | 'PANTALON' | 'ROBE' | 'JUPE' | 'VESTE' | 'COSTUME' | 'ENSEMBLE' | 'AUTRE';
export type ExpenseCategory = 'TISSU' | 'FIL' | 'MATERIEL' | 'TRANSPORT' | 'LOYER' | 'ELECTRICITE' | 'SALAIRES' | 'ENTRETIEN' | 'AUTRE';
export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';

export type SubscriptionPlanId = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  priceXOF: number;
  priceEUR: number;
  interval: 'month' | 'year';
  stripePriceId?: string;
  features: string[];
  maxOrdersPerMonth?: number;
  maxMembers?: number;
  isPopular?: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Workshop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  logo_url?: string;
  currency: string;
  currency_symbol: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkshopMember {
  id: string;
  workshop_id: string;
  user_id: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  invited_by?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Customer {
  id: string;
  workshop_id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gender?: GenderType;
  photo_url?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Computed
  total_orders?: number;
  total_spent?: number;
  total_balance?: number;
  last_order_at?: string;
}

export interface MeasurementType {
  id: string;
  workshop_id: string;
  name: string;
  unit: string;
  sort_order: number;
  is_custom: boolean;
  created_at: string;
}

export interface MeasurementProfile {
  id: string;
  workshop_id: string;
  customer_id: string;
  label?: string;
  taken_at: string;
  taken_by?: string;
  notes?: string;
  fabric_image_url?: string;
  model_image_url?: string;
  fabric_type?: string;
  created_at: string;
  values?: MeasurementValue[];
}

export interface MeasurementValue {
  id: string;
  profile_id: string;
  workshop_id: string;
  measurement_type_id: string;
  value: number;
  unit: string;
  measurement_type?: MeasurementType;
}

export interface OrderItem {
  id: string;
  order_id: string;
  workshop_id: string;
  name: string;
  garment_type?: GarmentType;
  fabric?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  reference_image_url?: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: string;
  workshop_id: string;
  customer_id: string;
  order_number: string;
  status: OrderStatus;
  priority: PriorityLevel;
  total_amount: number;
  paid_amount: number;
  balance: number;
  order_date: string;
  due_date?: string;
  assigned_to?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined
  customer?: Customer;
  items?: OrderItem[];
  payments?: Payment[];
  status_history?: OrderStatusHistory[];
  is_late?: boolean;
  assignee_name?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  workshop_id: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by?: string;
  notes?: string;
  changed_at: string;
  changer_name?: string;
}

export interface Payment {
  id: string;
  workshop_id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  payment_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
  order?: { order_number: string };
}

export interface Expense {
  id: string;
  workshop_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method?: PaymentMethod;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  workshop_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workshop_id?: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// -------  Dashboard types -------
export interface DashboardStats {
  ordersToday: number;
  ordersDueToday: number;
  ordersDueTomorrow: number;
  ordersLate: number;
  ordersInProduction: number;
  ordersReady: number;
  paymentsThisMonth: number;
  balanceToRecover: number;
  totalCustomers: number;
  revenueThisMonth: number;
}

export interface RecentActivity {
  id: string;
  type: 'order_created' | 'payment_added' | 'status_changed' | 'customer_created' | 'order_delivered';
  label: string;
  time: string;
  entity_id?: string;
}

export interface GarmentModel {
  id: string;
  workshop_id?: string;
  title: string;
  category: 'FEMME' | 'HOMME' | 'ENFANT';
  image_url: string;
  price_estimate?: number;
  description?: string;
  fabric_suggested?: string;
  created_at?: string;
}

// ------- Form types -------
export interface CreateCustomerInput {
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gender?: GenderType;
  notes?: string;
}

export interface CreateOrderInput {
  customer_id: string;
  due_date?: string;
  priority: PriorityLevel;
  notes?: string;
  assigned_to?: string;
  items: CreateOrderItemInput[];
  initial_payment?: number;
  initial_payment_method?: PaymentMethod;
  payment_method?: PaymentMethod;
}

export interface CreateOrderItemInput {
  name: string;
  garment_type?: GarmentType;
  fabric?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface CreatePaymentInput {
  order_id: string;
  customer_id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  payment_date: string;
}

export interface CreateMeasurementInput {
  customer_id: string;
  label?: string;
  notes?: string;
  fabric_image_url?: string;
  model_image_url?: string;
  fabric_type?: string;
  values: { measurement_type_id: string; value: number; unit: string }[];
}
