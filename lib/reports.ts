import "server-only";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_LABELS, formatDate, formatDateTime, PAYMENT_LABELS } from "@/lib/format";
import type { PeriodRange } from "@/lib/periods";

export type ColumnKind = "text" | "money" | "number" | "percent";
export interface ReportColumn { key: string; label: string; kind?: ColumnKind }
export interface ReportData { title: string; description: string; columns: ReportColumn[]; rows: Record<string, string | number | null>[]; usesPeriod: boolean; totals?: Record<string, number> }

export const REPORTS = {
  "ventes-jour": "Ventes par jour",
  "ventes-mois": "Ventes par mois",
  produits: "Ventes et marges par article",
  categories: "Ventes par catégorie",
  employes: "Ventes par employé",
  stock: "Stock et valorisation",
  rotation: "Faible rotation",
  depenses: "Dépenses",
  creances: "Créances clients",
  dettes: "Dettes fournisseurs",
  clotures: "Clôtures et écarts de caisse",
  retours: "Retours",
} as const;
export type ReportKey = keyof typeof REPORTS;

export function isReportKey(k: string): k is ReportKey {
  return k in REPORTS;
}

function sumBy(rows: Record<string, unknown>[], keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)]));
}

export async function loadReport(key: ReportKey, period: PeriodRange): Promise<ReportData> {
  const supabase = await createClient();
  const range = { p_from: period.from, p_to: period.to };
  const check = <T,>(res: { data: T | null; error: unknown }): T => {
    if (res.error) throw res.error;
    return (res.data ?? []) as T;
  };

  switch (key) {
    case "ventes-jour": {
      const rows = check(await supabase.rpc("report_sales_by_day", range)) as Record<string, number | string>[];
      const out = rows.map((r) => ({ jour: formatDate(String(r.day)), ventes: r.sales_count, ca: r.gross_sales, remises: r.discounts, cout: r.cogs, marge: r.margin }));
      return {
        title: REPORTS[key], description: "Ventes validées (hors annulées), montants nets de remises, avant retours.", usesPeriod: true,
        columns: [{ key: "jour", label: "Jour" }, { key: "ventes", label: "Ventes", kind: "number" }, { key: "ca", label: "Chiffre d'affaires", kind: "money" }, { key: "remises", label: "Remises", kind: "money" }, { key: "cout", label: "Coût d'achat", kind: "money" }, { key: "marge", label: "Marge brute", kind: "money" }],
        rows: out, totals: sumBy(out, ["ventes", "ca", "remises", "cout", "marge"]),
      };
    }
    case "ventes-mois": {
      const rows = check(await supabase.rpc("report_sales_by_month", range)) as Record<string, number | string>[];
      const out = rows.map((r) => ({ mois: String(r.month).split("-").reverse().join("/"), ventes: r.sales_count, ca: r.gross_sales, cout: r.cogs, marge: r.margin }));
      return {
        title: REPORTS[key], description: "Agrégation mensuelle des ventes validées.", usesPeriod: true,
        columns: [{ key: "mois", label: "Mois" }, { key: "ventes", label: "Ventes", kind: "number" }, { key: "ca", label: "Chiffre d'affaires", kind: "money" }, { key: "cout", label: "Coût d'achat", kind: "money" }, { key: "marge", label: "Marge brute", kind: "money" }],
        rows: out, totals: sumBy(out, ["ventes", "ca", "cout", "marge"]),
      };
    }
    case "produits": {
      const rows = check(await supabase.rpc("report_sales_by_product", range)) as Record<string, number | string | null>[];
      const out = rows.map((r) => ({ article: `${r.product_name} — ${r.variant_label}`, categorie: r.category_name ?? "—", vendus: r.quantity, retournes: r.returned_quantity, ca: r.net_sales, cout: r.cogs, marge: r.margin, taux: r.margin_rate }));
      return {
        title: REPORTS[key], description: "Chiffre d'affaires et coût nets des retours de la période ; marge = CA net − coût d'achat enregistré à la vente.", usesPeriod: true,
        columns: [{ key: "article", label: "Article" }, { key: "categorie", label: "Catégorie" }, { key: "vendus", label: "Vendus", kind: "number" }, { key: "retournes", label: "Retournés", kind: "number" }, { key: "ca", label: "CA net", kind: "money" }, { key: "cout", label: "Coût", kind: "money" }, { key: "marge", label: "Marge", kind: "money" }, { key: "taux", label: "Taux de marge", kind: "percent" }],
        rows: out, totals: sumBy(out, ["vendus", "retournes", "ca", "cout", "marge"]),
      };
    }
    case "categories": {
      const rows = check(await supabase.rpc("report_sales_by_category", range)) as Record<string, number | string>[];
      const out = rows.map((r) => ({ categorie: r.category_name, quantite: r.quantity, ca: r.net_sales, cout: r.cogs, marge: r.margin }));
      return {
        title: REPORTS[key], description: "Ventes nettes des retours, par catégorie.", usesPeriod: true,
        columns: [{ key: "categorie", label: "Catégorie" }, { key: "quantite", label: "Quantité nette", kind: "number" }, { key: "ca", label: "CA net", kind: "money" }, { key: "cout", label: "Coût", kind: "money" }, { key: "marge", label: "Marge", kind: "money" }],
        rows: out, totals: sumBy(out, ["quantite", "ca", "cout", "marge"]),
      };
    }
    case "employes": {
      const rows = check(await supabase.rpc("report_sales_by_employee", range)) as Record<string, number | string>[];
      const out = rows.map((r) => ({ employe: r.full_name, ventes: r.sales_count, ca: r.gross_sales, remises: r.discounts, panier: r.average_basket }));
      return {
        title: REPORTS[key], description: "Ventes validées par caissier (avant retours).", usesPeriod: true,
        columns: [{ key: "employe", label: "Employé" }, { key: "ventes", label: "Ventes", kind: "number" }, { key: "ca", label: "Chiffre d'affaires", kind: "money" }, { key: "remises", label: "Remises accordées", kind: "money" }, { key: "panier", label: "Panier moyen", kind: "money" }],
        rows: out, totals: sumBy(out, ["ventes", "ca", "remises"]),
      };
    }
    case "stock": {
      const rows = check(await supabase.from("v_variant_stock").select("product_name, variant_label, category_name, barcode, stock_qty, purchase_price, sale_price, stock_value, stock_status").eq("product_status", "active").order("product_name").limit(5000)) as Record<string, number | string | null>[];
      const out = rows.map((r) => ({ article: `${r.product_name} — ${r.variant_label}`, categorie: r.category_name ?? "—", code: r.barcode ?? "", stock: r.stock_qty, cout: r.purchase_price, prix: r.sale_price, valeur: Math.max(0, Number(r.stock_value)), etat: r.stock_status === "out" ? "Rupture" : r.stock_status === "low" ? "Faible" : "OK" }));
      return {
        title: REPORTS[key], description: "Stock actuel valorisé au dernier coût d'achat enregistré (instantané, indépendant de la période).", usesPeriod: false,
        columns: [{ key: "article", label: "Article" }, { key: "categorie", label: "Catégorie" }, { key: "code", label: "Code-barres" }, { key: "stock", label: "Stock", kind: "number" }, { key: "cout", label: "Coût unitaire", kind: "money" }, { key: "prix", label: "Prix de vente", kind: "money" }, { key: "valeur", label: "Valeur au coût", kind: "money" }, { key: "etat", label: "État" }],
        rows: out, totals: sumBy(out, ["stock", "valeur"]),
      };
    }
    case "rotation": {
      const rows = check(await supabase.rpc("report_slow_movers", { p_days: 60, p_max_sold: 1 })) as Record<string, number | string | null>[];
      const out = rows.map((r) => ({ article: `${r.product_name} — ${r.variant_label}`, stock: r.stock_qty, valeur: r.stock_value, vendus: r.sold_quantity, derniere: r.last_sale_at ? formatDate(String(r.last_sale_at)) : "Jamais" }));
      return {
        title: REPORTS[key], description: "Articles en stock vendus au plus une fois ces 60 derniers jours : candidats à une promotion.", usesPeriod: false,
        columns: [{ key: "article", label: "Article" }, { key: "stock", label: "Stock", kind: "number" }, { key: "valeur", label: "Valeur immobilisée", kind: "money" }, { key: "vendus", label: "Vendus (60 j)", kind: "number" }, { key: "derniere", label: "Dernière vente" }],
        rows: out, totals: sumBy(out, ["stock", "valeur"]),
      };
    }
    case "depenses": {
      const rows = check(await supabase.from("expenses").select("expense_date, category, amount, method, comment, voided_at, profiles:created_by(full_name)").gte("expense_date", period.fromDate).lte("expense_date", period.toDate).is("voided_at", null).order("expense_date")) as unknown as Record<string, unknown>[];
      const out = rows.map((r) => ({ date: formatDate(String(r.expense_date)), categorie: EXPENSE_LABELS[String(r.category)], montant: Number(r.amount), moyen: PAYMENT_LABELS[String(r.method)], commentaire: (r.comment as string) ?? "", par: (r.profiles as { full_name: string } | null)?.full_name ?? "" }));
      return {
        title: REPORTS[key], description: "Dépenses non annulées, par date de dépense.", usesPeriod: true,
        columns: [{ key: "date", label: "Date" }, { key: "categorie", label: "Catégorie" }, { key: "montant", label: "Montant", kind: "money" }, { key: "moyen", label: "Moyen" }, { key: "commentaire", label: "Commentaire" }, { key: "par", label: "Saisie par" }],
        rows: out, totals: sumBy(out, ["montant"]),
      };
    }
    case "creances": {
      const rows = check(await supabase.rpc("report_customer_receivables")) as Record<string, number | string | null>[];
      const out = rows.map((r) => ({ client: r.customer_name, telephone: r.phone ?? "", ventes: r.open_sales, du: r.balance_due, depuis: r.oldest_sale_at ? formatDate(String(r.oldest_sale_at)) : "" }));
      return {
        title: REPORTS[key], description: "Ventes à crédit non soldées, à date.", usesPeriod: false,
        columns: [{ key: "client", label: "Client" }, { key: "telephone", label: "Téléphone" }, { key: "ventes", label: "Ventes ouvertes", kind: "number" }, { key: "du", label: "Montant dû", kind: "money" }, { key: "depuis", label: "Plus ancienne" }],
        rows: out, totals: sumBy(out, ["du"]),
      };
    }
    case "dettes": {
      const rows = check(await supabase.rpc("report_supplier_balances")) as Record<string, number | string>[];
      const out = rows.map((r) => ({ fournisseur: r.supplier_name, commande: r.ordered, recu: r.received, regle: r.paid, solde: r.balance }));
      return {
        title: REPORTS[key], description: "Solde = marchandises reçues − règlements (négatif : avance versée).", usesPeriod: false,
        columns: [{ key: "fournisseur", label: "Fournisseur" }, { key: "commande", label: "Commandé", kind: "money" }, { key: "recu", label: "Reçu", kind: "money" }, { key: "regle", label: "Réglé", kind: "money" }, { key: "solde", label: "Solde dû", kind: "money" }],
        rows: out, totals: sumBy(out, ["commande", "recu", "regle", "solde"]),
      };
    }
    case "clotures": {
      const rows = check(await supabase.from("cash_sessions").select("register_name, opened_at, closed_at, opening_float, expected_cash, counted_cash, difference, difference_reason, opener:profiles!cash_sessions_opened_by_fkey(full_name)").eq("status", "closed").gte("closed_at", period.from).lt("closed_at", period.to).order("closed_at")) as unknown as Record<string, unknown>[];
      const out = rows.map((r) => ({ caisse: String(r.register_name), ouverture: formatDateTime(String(r.opened_at)), cloture: formatDateTime(String(r.closed_at)), par: (r.opener as { full_name: string } | null)?.full_name ?? "", fond: Number(r.opening_float), theorique: Number(r.expected_cash), compte: Number(r.counted_cash), ecart: Number(r.difference), motif: (r.difference_reason as string) ?? "" }));
      return {
        title: REPORTS[key], description: "Sessions clôturées sur la période : espèces théoriques, comptées et écarts.", usesPeriod: true,
        columns: [{ key: "caisse", label: "Caisse" }, { key: "ouverture", label: "Ouverture" }, { key: "cloture", label: "Clôture" }, { key: "par", label: "Ouverte par" }, { key: "fond", label: "Fond", kind: "money" }, { key: "theorique", label: "Théorique", kind: "money" }, { key: "compte", label: "Compté", kind: "money" }, { key: "ecart", label: "Écart", kind: "money" }, { key: "motif", label: "Motif" }],
        rows: out, totals: sumBy(out, ["ecart"]),
      };
    }
    case "retours": {
      const rows = check(await supabase.from("returns").select("return_number, created_at, reason, total_value, refund_amount, balance_reduction, refund_method, sales(sale_number), profiles:created_by(full_name)").gte("created_at", period.from).lt("created_at", period.to).order("created_at")) as unknown as Record<string, unknown>[];
      const out = rows.map((r) => ({ retour: String(r.return_number), date: formatDateTime(String(r.created_at)), vente: (r.sales as { sale_number: string } | null)?.sale_number ?? "", motif: String(r.reason), valeur: Number(r.total_value), rembourse: Number(r.refund_amount), mode: r.refund_method ? PAYMENT_LABELS[String(r.refund_method)] : "—", par: (r.profiles as { full_name: string } | null)?.full_name ?? "" }));
      return {
        title: REPORTS[key], description: "Retours enregistrés sur la période (valeur nette de remise).", usesPeriod: true,
        columns: [{ key: "retour", label: "Retour" }, { key: "date", label: "Date" }, { key: "vente", label: "Vente" }, { key: "motif", label: "Motif" }, { key: "valeur", label: "Valeur", kind: "money" }, { key: "rembourse", label: "Remboursé", kind: "money" }, { key: "mode", label: "Mode" }, { key: "par", label: "Traité par" }],
        rows: out, totals: sumBy(out, ["valeur", "rembourse"]),
      };
    }
  }
}
