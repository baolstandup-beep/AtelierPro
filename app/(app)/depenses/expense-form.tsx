"use client";
import { useState } from "react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { recordExpense } from "@/lib/actions/cash";
import { EXPENSE_LABELS, PAYMENT_LABELS, todayInShop } from "@/lib/format";

export function ExpenseForm({ sessionId }: { sessionId: string | null }) {
  const [method, setMethod] = useState("cash");
  return (
    <ActionForm action={recordExpense} resetOnSuccess className="flex flex-col gap-4 p-5">
      {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}
      <FormField label="Catégorie" htmlFor="e-cat" name="category" required>
        <Select id="e-cat" name="category" defaultValue="packaging">
          {Object.entries(EXPENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField label="Montant (FCFA)" htmlFor="e-amount" name="amount" required>
        <Input id="e-amount" name="amount" inputMode="numeric" required />
      </FormField>
      <FormField label="Date" htmlFor="e-date" name="expense_date" required>
        <Input id="e-date" name="expense_date" type="date" defaultValue={todayInShop()} required />
      </FormField>
      <FormField label="Moyen de paiement" htmlFor="e-method" name="method">
        <Select id="e-method" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
          {(["cash", "wave", "orange_money", "bank_transfer"] as const).map((m) => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
        </Select>
      </FormField>
      {method === "cash" ? (
        sessionId ? <Checkbox name="from_register" defaultChecked label="Payée avec les espèces de la caisse ouverte" /> : <p className="text-xs text-muted">Aucune caisse ouverte : la dépense est enregistrée hors caisse.</p>
      ) : null}
      <FormField label="Commentaire" htmlFor="e-comment" name="comment">
        <Textarea id="e-comment" name="comment" maxLength={500} />
      </FormField>
      <SubmitButton>Enregistrer la dépense</SubmitButton>
    </ActionForm>
  );
}
