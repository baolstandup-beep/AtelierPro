"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, Loader2, Minus, Plus, Printer, Search, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/components/ui/cn";
import { useOnline } from "@/components/layout/network-status";
import { CameraScanner } from "./camera-scanner";
import { checkout as checkoutAction, quickCreateCustomer, searchCustomers, searchProducts, type CheckoutResult, type PosCustomer, type PosItem } from "@/lib/actions/pos";
import { checkout as computeCheckout, percentToAmount, type Payment } from "@/lib/calc";
import { formatFCFA, PAYMENT_LABELS, parseAmount } from "@/lib/format";

interface CartLine extends PosItem {
  quantity: number;
}
interface PaymentRow {
  id: number;
  method: Payment["method"];
  amount: string;
  reference: string;
  auto: boolean;
}

const STORAGE_KEY = "eba:pos-cart";
const newOperationId = () => crypto.randomUUID();

export function PosTerminal({
  session,
  cashierName,
  shopName,
  canDiscount,
  maxDiscountPercent,
  isAdmin,
  canCredit,
  canCustomers,
  canCreateCustomer,
}: {
  session: { id: string; register_name: string };
  cashierName: string;
  shopName: string;
  canDiscount: boolean;
  maxDiscountPercent: number;
  isAdmin: boolean;
  canCredit: boolean;
  canCustomers: boolean;
  canCreateCustomer: boolean;
}) {
  const online = useOnline();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosItem[]>([]);
  const [searching, startSearch] = useTransition();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [payments, setPayments] = useState<PaymentRow[]>([{ id: 1, method: "cash", amount: "", reference: "", auto: true }]);
  const [cashReceived, setCashReceived] = useState("");
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [operationId, setOperationId] = useState<string>(newOperationId);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<CheckoutResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // Restauration du panier après un rechargement accidentel (même onglet).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { sessionId: string; cart: CartLine[]; operationId: string; customer: PosCustomer | null };
        if (saved.sessionId === session.id && saved.cart?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique depuis sessionStorage
          setCart(saved.cart);
          setOperationId(saved.operationId);
          setCustomer(saved.customer);
        }
      }
    } catch {
      /* stockage indisponible */
    }
  }, [session.id]);
  useEffect(() => {
    try {
      if (cart.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: session.id, cart, operationId, customer }));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible */
    }
  }, [cart, operationId, customer, session.id]);

  const focusSearch = useCallback(() => setTimeout(() => searchRef.current?.focus(), 0), []);

  const subtotal = cart.reduce((s, l) => s + l.sale_price * l.quantity, 0);
  const discountValue = parseAmount(discountInput) ?? 0;
  const discount = discountMode === "percent" ? percentToAmount(subtotal, discountValue) : Math.max(0, discountValue);
  const total = Math.max(0, subtotal - discount);
  const discountCap = isAdmin ? subtotal : Math.floor((subtotal * maxDiscountPercent) / 100);

  // Montant d'une ligne « auto » = reste à payer après les autres lignes.
  const resolvedPayments: Payment[] = useMemo(() => {
    const manual = payments.filter((p) => !p.auto).reduce((s, p) => s + (parseAmount(p.amount) ?? 0), 0);
    return payments.map((p) => ({ method: p.method, amount: p.auto ? Math.max(0, total - manual) : (parseAmount(p.amount) ?? 0) }));
  }, [payments, total]);
  const cashTendered = parseAmount(cashReceived);
  const summary = computeCheckout(
    cart.map((l) => ({ variantId: l.variant_id, unitPrice: l.sale_price, quantity: l.quantity })),
    discount,
    resolvedPayments,
    cashTendered,
  );
  const hasCash = resolvedPayments.some((p) => p.method === "cash" && p.amount > 0);
  const cashShort = hasCash && cashTendered != null && cashTendered < summary.cashPart;

  const addItem = useCallback(
    (item: PosItem) => {
      setCart((c) => {
        const existing = c.find((l) => l.variant_id === item.variant_id);
        if (existing) return c.map((l) => (l.variant_id === item.variant_id ? { ...l, quantity: l.quantity + 1 } : l));
        return [...c, { ...item, quantity: 1 }];
      });
      if (item.stock_qty <= 0) toast.warning(`« ${item.product_name} » est indiqué en rupture : la vente sera refusée si le stock est insuffisant.`);
      setQuery("");
      setResults([]);
      focusSearch();
    },
    [focusSearch],
  );

  const runSearch = useCallback(
    (term: string, addIfExact: boolean) => {
      startSearch(async () => {
        const res = await searchProducts(term);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        const items = res.data ?? [];
        const exact = items.filter((i) => i.exact);
        if (addIfExact && exact.length === 1) return addItem(exact[0]);
        if (addIfExact && items.length === 0) toast.error(`Aucun article pour « ${term} ».`);
        setResults(items);
      });
    },
    [addItem],
  );

  // Recherche au fil de la saisie (noms) ; le lecteur de codes-barres termine par Entrée.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || /^\d{6,}$/.test(term)) return;
    const t = setTimeout(() => runSearch(term, false), 250);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.variant_id !== id) : c.map((l) => (l.variant_id === id ? { ...l, quantity: Math.min(qty, 10000) } : l))));

  const resetSale = () => {
    setCart([]);
    setDiscountInput("");
    setPayments([{ id: 1, method: "cash", amount: "", reference: "", auto: true }]);
    setCashReceived("");
    setCustomer(null);
    setOperationId(newOperationId());
    setDone(null);
    focusSearch();
  };

  const validationError = (() => {
    if (!cart.length) return "Le panier est vide.";
    if (discount > 0 && !canDiscount) return "Remise non autorisée.";
    if (discount > discountCap) return `Remise maximale : ${formatFCFA(discountCap)} (${maxDiscountPercent} %).`;
    if (summary.overpaid) return "Les paiements dépassent le total.";
    if (cashShort) return "Le montant reçu est inférieur à la part en espèces.";
    if (resolvedPayments.some((p) => p.method === "store_credit" && p.amount > 0) && (!customer || customer.store_credit < resolvedPayments.filter((p) => p.method === "store_credit").reduce((s, p) => s + p.amount, 0)))
      return "Avoir client insuffisant.";
    if (summary.balanceDue > 0 && !customer) return "Paiement incomplet : choisissez un client pour enregistrer un crédit.";
    if (summary.balanceDue > 0 && !canCredit) return "Paiement incomplet : vente à crédit non autorisée.";
    return null;
  })();

  async function submit() {
    if (validationError || submitting || !online) return;
    setSubmitting(true);
    try {
      const res = await checkoutAction({
        operationId,
        sessionId: session.id,
        items: cart.map((l) => ({ variantId: l.variant_id, quantity: l.quantity })),
        payments: resolvedPayments
          .map((p, i) => ({ ...p, reference: payments[i]?.reference || undefined }))
          .filter((p) => p.amount > 0),
        discount,
        customerId: customer?.id ?? null,
        cashTendered: hasCash ? (cashTendered ?? summary.cashPart) : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone(res.data!);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* rien */
      }
    } catch {
      // Réseau coupé pendant l'envoi : on garde le même identifiant d'opération,
      // un nouvel essai ne pourra pas créer de doublon.
      toast.error("Connexion interrompue. Réessayez : la vente ne sera pas enregistrée deux fois.");
    } finally {
      setSubmitting(false);
    }
  }

  // Raccourci F9 / Ctrl+Entrée pour encaisser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F9" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
      {/* Recherche et résultats */}
      <section aria-label="Articles" className="flex min-w-0 flex-col gap-4">
        <div className="flex gap-2">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) runSearch(query.trim(), true);
            }}
          >
            <label htmlFor="pos-search" className="sr-only">Scanner ou rechercher un article</label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              ref={searchRef}
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scanner un code-barres ou taper un nom"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              className="h-14 pl-11 text-base"
            />
            {searching ? <Loader2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin text-muted" aria-label="Recherche" /> : null}
          </form>
          <Button variant="secondary" size="lg" className="h-14" onClick={() => setCameraOpen(true)} aria-label="Scanner avec la caméra">
            <Camera aria-hidden />
          </Button>
        </div>

        {results.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Résultats">
            {results.map((r) => (
              <li key={r.variant_id}>
                <button
                  onClick={() => addItem(r)}
                  className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-panel)] border border-sand bg-paper p-3 text-left hover:border-gold focus-visible:border-gold"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.product_name}</span>
                    <span className="block truncate text-sm text-muted">{r.variant_label}</span>
                    <span className="mt-1 block">
                      {r.stock_qty <= 0 ? <Badge tone="danger">Rupture</Badge> : <Badge tone={r.stock_qty <= 2 ? "warning" : "neutral"}>{r.stock_qty} en stock</Badge>}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular">{formatFCFA(r.sale_price)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="hidden rounded-[var(--radius-panel)] border border-dashed border-sand-strong px-6 py-10 text-center text-sm text-muted sm:block">
            Lecteur USB ou Bluetooth : scannez directement, l&apos;article s&apos;ajoute au ticket. Raccourci pour encaisser : F9.
          </div>
        )}
      </section>

      {/* Ticket en cours */}
      <section id="ticket-en-cours" aria-label="Ticket en cours" className="receipt flex flex-col rounded-t-[var(--radius-panel)] border border-b-0 border-sand pb-6 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]">
        <header className="px-5 pt-5 text-center">
          <p className="font-display text-xl">{shopName}</p>
          <p className="text-xs text-muted">
            {session.register_name} · {cashierName}
          </p>
        </header>
        <div className="mx-5 my-4 h-px bg-gold/70" aria-hidden />

        <div className="min-h-24 flex-1 overflow-y-auto px-5">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aucun article.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {cart.map((l) => (
                <li key={l.variant_id} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.product_name}</span>
                      <span className="block truncate text-xs text-muted">
                        {l.variant_label} · {formatFCFA(l.sale_price)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular">{formatFCFA(l.sale_price * l.quantity)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <Button variant="secondary" size="sm" className="size-8 px-0" onClick={() => setQty(l.variant_id, l.quantity - 1)} aria-label={`Retirer un ${l.product_name}`}>
                      <Minus aria-hidden />
                    </Button>
                    <input
                      aria-label={`Quantité ${l.product_name}`}
                      inputMode="numeric"
                      value={l.quantity}
                      onChange={(e) => setQty(l.variant_id, Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="h-8 w-12 rounded border border-sand-strong text-center text-sm tabular"
                    />
                    <Button variant="secondary" size="sm" className="size-8 px-0" onClick={() => setQty(l.variant_id, l.quantity + 1)} aria-label={`Ajouter un ${l.product_name}`}>
                      <Plus aria-hidden />
                    </Button>
                    {l.quantity > l.stock_qty ? <span className="ml-2 text-xs text-danger">Stock : {l.stock_qty}</span> : null}
                    <Button variant="ghost" size="sm" className="ml-auto size-8 px-0" onClick={() => setQty(l.variant_id, 0)} aria-label={`Supprimer ${l.product_name}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="receipt-rule mx-5 mt-4" />
        <div className="flex flex-col gap-3 px-5 pt-4 text-sm">
          {canCustomers ? (
            <div className="flex items-center justify-between gap-2">
              {customer ? (
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium"><UserRound className="size-4" aria-hidden /> {customer.name}</span>
                  <span className="block text-xs text-muted">
                    {[customer.phone, customer.store_credit > 0 && `Avoir ${formatFCFA(customer.store_credit)}`, customer.balance_due > 0 && `Doit ${formatFCFA(customer.balance_due)}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              ) : (
                <span className="text-muted">Client de passage</span>
              )}
              <div className="flex gap-1">
                {customer ? (
                  <Button variant="ghost" size="sm" onClick={() => setCustomer(null)} aria-label="Retirer le client"><X aria-hidden /></Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={() => setCustomerOpen(true)}>
                  <UserPlus aria-hidden /> {customer ? "Changer" : "Client"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between"><span>Sous-total</span><span className="tabular">{formatFCFA(subtotal)}</span></div>
          {canDiscount ? (
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="discount">Remise</label>
              <div className="flex items-center gap-1">
                <Input id="discount" inputMode="numeric" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0" className="h-8 w-24 text-right" />
                <Select aria-label="Type de remise" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as "amount" | "percent")} className="h-8 w-24 pr-7">
                  <option value="amount">FCFA</option>
                  <option value="percent">%</option>
                </Select>
              </div>
            </div>
          ) : null}
          {discount > 0 ? (
            <div className={cn("flex justify-between", discount > discountCap && "text-danger")}>
              <span>Remise appliquée</span>
              <span className="tabular">−{formatFCFA(discount)}</span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-ink pt-3">
            <span className="text-base font-medium">Total</span>
            <span className="font-display text-3xl tabular">{formatFCFA(total)}</span>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">Paiement</legend>
            {payments.map((p, i) => (
              <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                <Select
                  aria-label={`Moyen de paiement ${i + 1}`}
                  value={p.method}
                  onChange={(e) => setPayments((ps) => ps.map((x) => (x.id === p.id ? { ...x, method: e.target.value as Payment["method"] } : x)))}
                  className="h-9 w-36"
                >
                  {(["cash", "wave", "orange_money", "bank_transfer"] as const).map((m) => (
                    <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
                  ))}
                  {customer && customer.store_credit > 0 ? <option value="store_credit">Avoir client</option> : null}
                </Select>
                <Input
                  aria-label={`Montant ${i + 1}`}
                  inputMode="numeric"
                  value={p.auto ? String(resolvedPayments[i]?.amount ?? "") : p.amount}
                  onChange={(e) => setPayments((ps) => ps.map((x) => (x.id === p.id ? { ...x, amount: e.target.value, auto: false } : x)))}
                  className="h-9 w-28 flex-1 text-right"
                />
                {payments.length > 1 ? (
                  <Button variant="ghost" size="sm" className="size-9 px-0" onClick={() => setPayments((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Retirer ce paiement">
                    <X aria-hidden />
                  </Button>
                ) : null}
                {p.method === "wave" || p.method === "orange_money" ? (
                  <Input
                    aria-label="Référence de transaction"
                    placeholder="Réf. transaction (facultatif)"
                    value={p.reference}
                    onChange={(e) => setPayments((ps) => ps.map((x) => (x.id === p.id ? { ...x, reference: e.target.value } : x)))}
                    className="h-8 basis-full text-xs"
                  />
                ) : null}
              </div>
            ))}
            {payments.length < 4 ? (
              <button
                type="button"
                className="self-start text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
                onClick={() =>
                  setPayments((ps) => [
                    ...ps.map((x) => ({ ...x, auto: false, amount: x.auto ? String(resolvedPayments[ps.indexOf(x)]?.amount ?? 0) : x.amount })),
                    { id: Date.now(), method: ps.some((x) => x.method === "cash") ? "wave" : "cash", amount: "", reference: "", auto: true },
                  ])
                }
              >
                Paiement mixte : ajouter un moyen
              </button>
            ) : null}
            {hasCash ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <label htmlFor="cash-received">Espèces reçues</label>
                <Input id="cash-received" inputMode="numeric" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder={String(summary.cashPart)} className="h-9 w-32 text-right" />
              </div>
            ) : null}
            {hasCash && summary.change > 0 ? (
              <div className="flex justify-between font-medium text-success"><span>Monnaie à rendre</span><span className="tabular">{formatFCFA(summary.change)}</span></div>
            ) : null}
            {summary.balanceDue > 0 && cart.length ? (
              <div className="flex justify-between font-medium text-warning"><span>Reste à payer (crédit)</span><span className="tabular">{formatFCFA(summary.balanceDue)}</span></div>
            ) : null}
          </fieldset>

          {validationError && cart.length ? <p className="text-xs text-danger" role="status">{validationError}</p> : null}
          {!online ? <p className="text-xs text-warning" role="status">Hors connexion : encaissement impossible.</p> : null}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetSale} disabled={!cart.length || submitting}>Vider</Button>
            <Button size="lg" className="flex-1" onClick={submit} disabled={!!validationError || submitting || !online}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {submitting ? "Enregistrement…" : `Encaisser ${formatFCFA(total)}`}
            </Button>
          </div>
        </div>
      </section>

      {cart.length > 0 ? (
        <a
          href="#ticket-en-cours"
          className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between rounded-[var(--radius-panel)] bg-ink px-4 py-3 text-sm text-ivory shadow-lg xl:hidden"
        >
          <span>{cart.reduce((s, l) => s + l.quantity, 0)} article(s)</span>
          <span className="font-semibold tabular">{formatFCFA(total)} · Voir le ticket</span>
        </a>
      ) : null}

      <CameraScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onDetected={(code) => { setQuery(code); runSearch(code, true); }} />

      <CustomerPicker
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        canCreate={canCreateCustomer}
        onPick={(c) => {
          setCustomer(c);
          setCustomerOpen(false);
          focusSearch();
        }}
      />

      <Dialog open={!!done} onClose={resetSale} title="Vente enregistrée" description={done ? `Ticket ${done.sale_number}` : undefined}>
        {done ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Total</dt><dd className="text-right font-medium tabular">{formatFCFA(done.total)}</dd>
              <dt className="text-muted">Payé</dt><dd className="text-right tabular">{formatFCFA(done.paid)}</dd>
              {done.change > 0 ? (<><dt className="text-muted">Monnaie rendue</dt><dd className="text-right text-lg font-semibold text-success tabular">{formatFCFA(done.change)}</dd></>) : null}
              {done.balance_due > 0 ? (<><dt className="text-muted">Reste à payer</dt><dd className="text-right font-medium text-warning tabular">{formatFCFA(done.balance_due)}</dd></>) : null}
            </dl>
            <div className="flex flex-wrap justify-end gap-2">
              <LinkButton href={`/ventes/${done.id}`} variant="ghost">Détail</LinkButton>
              <a href={`/tickets/${done.id}?imprimer=1`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-sand-strong bg-paper px-4 text-sm font-medium hover:bg-ivory">
                <Printer className="size-4" aria-hidden /> Imprimer le ticket
              </a>
              <Button onClick={resetSale} autoFocus>Nouvelle vente</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function CustomerPicker({ open, onClose, onPick, canCreate }: { open: boolean; onClose: () => void; onPick: (c: PosCustomer) => void; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<PosCustomer[]>([]);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const res = await searchCustomers(q);
      if (res.ok) setList(res.data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Dialog open={open} onClose={onClose} title="Client" description="Recherche par nom ou téléphone.">
      {creating ? (
        <ActionForm action={quickCreateCustomer} onSuccess={(data) => { setCreating(false); onPick(data as PosCustomer); }} className="flex flex-col gap-3">
          <FormField label="Prénom" htmlFor="qc-first" name="first_name" required><Input id="qc-first" name="first_name" required autoFocus /></FormField>
          <FormField label="Nom" htmlFor="qc-last" name="last_name"><Input id="qc-last" name="last_name" /></FormField>
          <FormField label="Téléphone" htmlFor="qc-phone" name="phone"><Input id="qc-phone" name="phone" type="tel" inputMode="tel" placeholder="77 123 45 67" /></FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Retour</Button>
            <SubmitButton>Créer le client</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <div className="flex flex-col gap-3">
          <Input aria-label="Rechercher un client" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone" autoFocus />
          <ul className="max-h-72 divide-y divide-sand overflow-y-auto">
            {(q.trim().length >= 2 ? list : []).map((c) => (
              <li key={c.id}>
                <button onClick={() => onPick(c)} className="flex w-full justify-between gap-3 px-2 py-2.5 text-left text-sm hover:bg-ivory">
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-xs text-muted">{c.phone ?? "Sans téléphone"}</span>
                  </span>
                  <span className="text-right text-xs">
                    {c.balance_due > 0 ? <span className="block text-warning">Doit {formatFCFA(c.balance_due)}</span> : null}
                    {c.store_credit > 0 ? <span className="block text-success">Avoir {formatFCFA(c.store_credit)}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {canCreate ? (
            <Button variant="secondary" onClick={() => setCreating(true)}><UserPlus aria-hidden /> Nouveau client</Button>
          ) : null}
          <Link href="/clients" className="text-center text-xs text-muted hover:text-ink">Gérer les clients</Link>
        </div>
      )}
    </Dialog>
  );
}
