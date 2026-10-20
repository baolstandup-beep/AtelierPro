// Calculs de panier côté interface (aperçu). La base de données refait TOUS
// les calculs à partir des prix enregistrés : ces fonctions doivent produire
// exactement les mêmes résultats que public.create_sale et public.process_return.

export interface CartLine {
  variantId: string;
  unitPrice: number;
  quantity: number;
}

export interface Payment {
  method: "cash" | "wave" | "orange_money" | "bank_transfer" | "store_credit";
  amount: number;
}

export function subtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

/** Remise en pourcentage → montant entier (arrondi à l'unité inférieure). */
export function percentToAmount(base: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.floor((base * Math.min(percent, 100)) / 100);
}

/** Répartition proportionnelle d'une remise globale ; reliquat sur la plus grosse ligne. */
export function allocateDiscount(lines: CartLine[], discount: number): number[] {
  const gross = lines.map((l) => l.unitPrice * l.quantity);
  const total = gross.reduce((a, b) => a + b, 0);
  if (discount <= 0 || total === 0) return gross.map(() => 0);
  if (discount > total) throw new Error("La remise dépasse le montant du panier.");
  const shares = gross.map((g) => Math.floor((discount * g) / total));
  const order = gross.map((g, i) => [g, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const allocated = shares.reduce((a, b) => a + b, 0);
  shares[order[0][1]] += discount - allocated;
  return shares;
}

export interface CheckoutSummary {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  cashPart: number;
  balanceDue: number;
  change: number;
  overpaid: boolean;
}

export function checkout(lines: CartLine[], discount: number, payments: Payment[], cashTendered?: number | null): CheckoutSummary {
  const sub = subtotal(lines);
  const disc = Math.max(0, Math.min(discount, sub));
  const total = sub - disc;
  const paid = payments.reduce((s, p) => s + (p.amount > 0 ? p.amount : 0), 0);
  const cashPart = payments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const change = cashTendered != null && cashTendered >= cashPart ? cashTendered - cashPart : 0;
  return {
    subtotal: sub,
    discount: disc,
    total,
    paid,
    cashPart,
    balanceDue: Math.max(0, total - paid),
    change,
    overpaid: paid > total,
  };
}

/** Valeur nette remboursable pour qty unités d'une ligne (même règle que process_return). */
export function returnValue(line: { lineTotal: number; quantity: number; returnedQty: number; refundedAmount: number }, qty: number): number {
  if (qty <= 0 || line.returnedQty + qty > line.quantity) throw new Error("Quantité de retour invalide.");
  const remaining = line.lineTotal - line.refundedAmount;
  if (line.returnedQty + qty === line.quantity) return remaining;
  return Math.min(Math.round((line.lineTotal * qty) / line.quantity), remaining);
}

export function grossMargin(netSales: number, cost: number) {
  const margin = netSales - cost;
  return { margin, rate: netSales > 0 ? Math.round((margin * 1000) / netSales) / 10 : null };
}

export function cashDifference(expected: number, counted: number) {
  const difference = counted - expected;
  return { difference, needsReason: difference !== 0 };
}
