// Formatage français, montants FCFA entiers, heure de Dakar (UTC+0, sans heure d'été).
export const SHOP_TIME_ZONE = "Africa/Dakar";

const amountFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1250000 → « 1 250 000 FCFA » (espaces insécables fines remplacées par des espaces insécables). */
export function formatFCFA(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  return `${amountFormatter.format(n).replace(/ /g, " ")} FCFA`;
}

export function formatNumber(value: number | null | undefined): string {
  return amountFormatter.format(Math.round(Number(value ?? 0))).replace(/ /g, " ");
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });

/** Date au format jj/mm/aaaa. Accepte un ISO complet ou une date « AAAA-MM-JJ ». */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${dateFormatter.format(d)} à ${timeFormatter.format(d)}`;
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau de la boutique. */
export function todayInShop(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIME_ZONE }).format(now);
}

/** « 12 500 », « 12500 FCFA », « 12.500 » → 12500. Retourne null si invalide. */
export function parseAmount(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).replace(/fcfa|f\s*cfa|cfa/gi, "").replace(/[\s  .]/g, "").replace(",", ".");
  if (raw === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  bank_transfer: "Virement",
  store_credit: "Avoir",
};

export const EXPENSE_LABELS: Record<string, string> = {
  rent: "Loyer",
  electricity: "Électricité",
  transport: "Transport",
  packaging: "Emballages",
  communication: "Communication",
  maintenance: "Entretien",
  salary: "Salaires",
  other: "Autres charges",
};

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  initial: "Stock initial",
  sale: "Vente",
  sale_cancel: "Annulation de vente",
  return: "Retour client",
  purchase_receipt: "Réception fournisseur",
  entry: "Entrée",
  exit: "Sortie",
  adjustment: "Correction",
  inventory: "Inventaire",
};

export const CASH_MOVEMENT_LABELS: Record<string, string> = {
  opening_float: "Fond de caisse",
  sale: "Vente (espèces)",
  credit_settlement: "Règlement de créance",
  refund: "Remboursement",
  expense: "Dépense",
  expense_void: "Annulation de dépense",
  supplier_payment: "Règlement fournisseur",
  cash_in: "Apport",
  cash_out: "Retrait",
  correction: "Correction",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  cashier: "Caissier",
  stock_manager: "Gestionnaire de stock",
  employee: "Employé",
};

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  ordered: "Commandée",
  partially_received: "Reçue en partie",
  received: "Reçue",
  cancelled: "Annulée",
};
