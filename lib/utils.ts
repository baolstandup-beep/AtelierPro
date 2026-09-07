import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { OrderStatus, PriorityLevel, PaymentMethod, GarmentType, ExpenseCategory } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  symbol: string = 'FCFA',
  currency: string = 'XOF'
): string {
  if (currency === 'XOF' || currency === 'XAF') {
    return `${amount.toLocaleString('fr-FR')} ${symbol}`;
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// ─── Date ─────────────────────────────────────────────────────
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { locale: fr, addSuffix: true });
}

export function formatDueDate(date: string | null | undefined): string {
  if (!date) return 'Sans échéance';
  const d = new Date(date);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return formatDate(d);
}

export function isDueDateLate(date: string | null | undefined, status?: OrderStatus): boolean {
  if (!date) return false;
  if (status === 'DELIVERED' || status === 'CANCELLED') return false;
  return isPast(new Date(date));
}

// ─── Order status labels & colors ─────────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nouveau',
  MEASURED: 'Mesures',
  CUTTING: 'En coupe',
  SEWING: 'En couture',
  FINISHING: 'Finition',
  READY: 'Prêt',
  DELIVERED: 'Livré',
  ON_HOLD: 'En attente',
  CANCELLED: 'Annulé',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  MEASURED: 'bg-blue-100 text-blue-700',
  CUTTING: 'bg-orange-100 text-orange-700',
  SEWING: 'bg-yellow-100 text-yellow-700',
  FINISHING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  ON_HOLD: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

export const KANBAN_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'NEW', label: 'Nouveau' },
  { status: 'MEASURED', label: 'Mesures' },
  { status: 'CUTTING', label: 'Coupe' },
  { status: 'SEWING', label: 'Couture' },
  { status: 'FINISHING', label: 'Finition' },
  { status: 'READY', label: 'Prêt' },
  { status: 'DELIVERED', label: 'Livré' },
];

// ─── Priority labels & colors ─────────────────────────────────
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgent',
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  LOW: 'text-slate-400',
  NORMAL: 'text-slate-600',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};

// ─── Payment labels ───────────────────────────────────────────
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  STRIPE: 'Carte bancaire (Stripe)',
  BANK: 'Virement bancaire',
  OTHER: 'Autre',
};

// ─── Garment type labels ──────────────────────────────────────
export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  BOUBOU: 'Grand Boubou',
  KAFTAN: 'Kaftan',
  CHEMISE: 'Chemise',
  PANTALON: 'Pantalon',
  ROBE: 'Robe',
  JUPE: 'Jupe',
  VESTE: 'Veste',
  COSTUME: 'Costume',
  ENSEMBLE: 'Ensemble',
  AUTRE: 'Autre',
};

// ─── Expense category labels ──────────────────────────────────
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TISSU: 'Tissu',
  FIL: 'Fil',
  MATERIEL: 'Matériel',
  TRANSPORT: 'Transport',
  LOYER: 'Loyer',
  ELECTRICITE: 'Électricité',
  SALAIRES: 'Salaires',
  ENTRETIEN: 'Entretien',
  AUTRE: 'Autre',
};

// ─── Order number generator ───────────────────────────────────
export function generateOrderNumber(year: number, sequence: number): string {
  return `CMD-${year}-${String(sequence).padStart(5, '0')}`;
}

// ─── Initials ─────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

// ─── Phone validation (Sénégal) ───────────────────────────────
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('221') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// ─── Truncate text ────────────────────────────────────────────
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}

// ─── Debounce ─────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

// ─── Image compression ────────────────────────────────────────
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression échouée'));
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// ─── File size validation ─────────────────────────────────────
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez JPG, PNG ou WebP.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image trop grande. Taille maximum : 10 Mo.';
  }
  return null;
}
