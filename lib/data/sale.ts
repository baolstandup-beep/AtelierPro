import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SaleDetail {
  id: string;
  sale_number: string;
  created_at: string;
  status: "completed" | "cancelled";
  subtotal: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  cash_tendered: number | null;
  change_given: number;
  note: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cash_session_id: string;
  customer: { id: string; first_name: string; last_name: string | null; phone: string | null } | null;
  cashier: { full_name: string } | null;
  canceller: { full_name: string } | null;
  items: {
    id: string; product_name: string; variant_label: string; barcode: string | null; quantity: number; unit_price: number;
    unit_cost: number; discount_amount: number; line_total: number; returned_qty: number; refunded_amount: number;
  }[];
  payments: { id: string; method: string; amount: number; kind: string; reference: string | null; created_at: string }[];
  refunds: { id: string; method: string; amount: number; kind: string; reason: string | null; created_at: string; return_id: string | null }[];
  returns: { id: string; return_number: string; created_at: string; reason: string; total_value: number; refund_amount: number; balance_reduction: number; refund_method: string | null }[];
}

export async function getSale(id: string): Promise<SaleDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select(
      `id, sale_number, created_at, status, subtotal, discount_amount, total, amount_paid, balance_due, cash_tendered, change_given,
       note, cancelled_at, cancel_reason, cash_session_id,
       customer:customers(id, first_name, last_name, phone),
       cashier:profiles!sales_cashier_id_fkey(full_name),
       canceller:profiles!sales_cancelled_by_fkey(full_name),
       items:sale_items(id, product_name, variant_label, barcode, quantity, unit_price, unit_cost, discount_amount, line_total, returned_qty, refunded_amount),
       payments(id, method, amount, kind, reference, created_at),
       refunds(id, method, amount, kind, reason, created_at, return_id),
       returns(id, return_number, created_at, reason, total_value, refund_amount, balance_reduction, refund_method)`,
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SaleDetail) ?? null;
}

export async function getShopSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_settings").select("*").single();
  return data as {
    shop_name: string; address: string | null; phone: string | null; email: string | null; legal_info: string | null;
    receipt_footer: string; allow_negative_stock: boolean; max_discount_percent: number; default_min_stock: number;
  } | null;
}

export async function getMyOpenSession(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("cash_sessions").select("id, register_name, opened_by").eq("status", "open").order("opened_at");
  const sessions = data ?? [];
  return sessions.find((s) => s.opened_by === userId) ?? (sessions.length === 1 ? sessions[0] : null);
}
