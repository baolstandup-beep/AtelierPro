"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveCustomer } from "@/lib/actions/customers";
import { recordSupplierPayment, saveSupplier } from "@/lib/actions/suppliers";
import { recordCreditPayment } from "@/lib/actions/sales";
import { PAYMENT_LABELS, todayInShop } from "@/lib/format";

export interface CustomerValues { id: string; first_name: string; last_name: string | null; phone: string | null; email: string | null; notes: string | null }
export interface SupplierValues { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; is_active: boolean }

export function CustomerDialog({ customer, label }: { customer?: CustomerValues; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={customer ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {customer ? null : <Plus aria-hidden />} {label ?? (customer ? "Modifier" : "Nouveau client")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={customer ? "Modifier le client" : "Nouveau client"} description="Ne saisissez que les informations utiles à la relation commerciale.">
        <ActionForm action={saveCustomer} onSuccess={() => setOpen(false)} redirectTo={customer ? undefined : (d) => `/clients/${(d as { id: string }).id}`} className="grid gap-4 sm:grid-cols-2">
          {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
          <FormField label="Prénom" htmlFor="c-first" name="first_name" required>
            <Input id="c-first" name="first_name" defaultValue={customer?.first_name} required maxLength={80} />
          </FormField>
          <FormField label="Nom" htmlFor="c-last" name="last_name">
            <Input id="c-last" name="last_name" defaultValue={customer?.last_name ?? ""} maxLength={80} />
          </FormField>
          <FormField label="Téléphone" htmlFor="c-phone" name="phone">
            <Input id="c-phone" name="phone" type="tel" inputMode="tel" defaultValue={customer?.phone ?? ""} placeholder="77 123 45 67" />
          </FormField>
          <FormField label="E-mail" htmlFor="c-email" name="email">
            <Input id="c-email" name="email" type="email" defaultValue={customer?.email ?? ""} />
          </FormField>
          <FormField label="Notes" htmlFor="c-notes" name="notes" className="sm:col-span-2" hint="Préférences, tailles habituelles…">
            <Textarea id="c-notes" name="notes" defaultValue={customer?.notes ?? ""} maxLength={1000} />
          </FormField>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function SupplierDialog({ supplier }: { supplier?: SupplierValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={supplier ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {supplier ? "Modifier" : <><Plus aria-hidden /> Nouveau fournisseur</>}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
        <ActionForm action={saveSupplier} onSuccess={() => setOpen(false)} redirectTo={supplier ? undefined : (d) => `/fournisseurs/${(d as { id: string }).id}`} className="grid gap-4 sm:grid-cols-2">
          {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}
          <FormField label="Nom" htmlFor="s-name" name="name" required className="sm:col-span-2">
            <Input id="s-name" name="name" defaultValue={supplier?.name} required maxLength={120} />
          </FormField>
          <FormField label="Contact" htmlFor="s-contact" name="contact_name">
            <Input id="s-contact" name="contact_name" defaultValue={supplier?.contact_name ?? ""} />
          </FormField>
          <FormField label="Téléphone" htmlFor="s-phone" name="phone">
            <Input id="s-phone" name="phone" type="tel" defaultValue={supplier?.phone ?? ""} />
          </FormField>
          <FormField label="E-mail" htmlFor="s-email" name="email">
            <Input id="s-email" name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </FormField>
          <FormField label="Adresse" htmlFor="s-address" name="address">
            <Input id="s-address" name="address" defaultValue={supplier?.address ?? ""} />
          </FormField>
          <FormField label="Notes" htmlFor="s-notes" name="notes" className="sm:col-span-2">
            <Textarea id="s-notes" name="notes" defaultValue={supplier?.notes ?? ""} />
          </FormField>
          {supplier ? <Checkbox name="is_active" defaultChecked={supplier.is_active} label="Fournisseur actif" /> : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

const METHODS = ["cash", "wave", "orange_money", "bank_transfer"] as const;

export function CreditPaymentForm({ customerId, sessionId, maxAmount }: { customerId: string; sessionId: string | null; maxAmount: number }) {
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  return (
    <ActionForm action={recordCreditPayment} resetOnSuccess onSuccess={() => setOperationId(crypto.randomUUID())} className="flex flex-col gap-3 p-5">
      <input type="hidden" name="operation_id" value={operationId} />
      <input type="hidden" name="customer_id" value={customerId} />
      {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}
      <FormField label="Montant reçu (FCFA)" htmlFor="cp-amount" name="amount" required hint={`Créance actuelle : ${maxAmount.toLocaleString("fr-FR")} FCFA`}>
        <Input id="cp-amount" name="amount" inputMode="numeric" required />
      </FormField>
      <FormField label="Moyen" htmlFor="cp-method" name="method">
        <Select id="cp-method" name="method" defaultValue={sessionId ? "cash" : "wave"}>
          {METHODS.map((m) => (
            <option key={m} value={m} disabled={m === "cash" && !sessionId}>{PAYMENT_LABELS[m]}{m === "cash" && !sessionId ? " (aucune caisse ouverte)" : ""}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Référence" htmlFor="cp-ref" name="reference">
        <Input id="cp-ref" name="reference" maxLength={80} placeholder="N° de transaction (facultatif)" />
      </FormField>
      <SubmitButton>Enregistrer le règlement</SubmitButton>
    </ActionForm>
  );
}

export function SupplierPaymentForm({ supplierId, purchaseId, sessionId, suggested }: { supplierId: string; purchaseId?: string; sessionId: string | null; suggested?: number }) {
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  return (
    <ActionForm action={recordSupplierPayment} resetOnSuccess onSuccess={() => setOperationId(crypto.randomUUID())} className="flex flex-col gap-3 p-5">
      <input type="hidden" name="operation_id" value={operationId} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      {purchaseId ? <input type="hidden" name="purchase_id" value={purchaseId} /> : null}
      {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}
      <FormField label="Montant (FCFA)" htmlFor="sp-amount" name="amount" required>
        <Input id="sp-amount" name="amount" inputMode="numeric" defaultValue={suggested && suggested > 0 ? suggested : ""} required />
      </FormField>
      <FormField label="Moyen" htmlFor="sp-method" name="method">
        <Select id="sp-method" name="method" defaultValue="wave">
          {METHODS.map((m) => (
            <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Date du règlement" htmlFor="sp-date" name="paid_at">
        <Input id="sp-date" name="paid_at" type="date" defaultValue={todayInShop()} />
      </FormField>
      <FormField label="Référence" htmlFor="sp-ref" name="reference">
        <Input id="sp-ref" name="reference" maxLength={80} />
      </FormField>
      {sessionId ? <Checkbox name="from_register" label="Espèces prises dans la caisse ouverte" /> : null}
      <SubmitButton>Enregistrer le règlement</SubmitButton>
    </ActionForm>
  );
}
