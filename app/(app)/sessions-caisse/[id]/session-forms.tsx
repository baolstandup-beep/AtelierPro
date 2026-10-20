"use client";
import { useState } from "react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addCashMovement, closeCashSession, correctCashSession } from "@/lib/actions/cash";
import { cashDifference } from "@/lib/calc";
import { formatFCFA, parseAmount } from "@/lib/format";

export function CashMovementForm({ sessionId }: { sessionId: string }) {
  return (
    <ActionForm action={addCashMovement} resetOnSuccess className="flex flex-col gap-3 p-5">
      <input type="hidden" name="session_id" value={sessionId} />
      <FormField label="Type" htmlFor="cm-type" name="type">
        <Select id="cm-type" name="type" defaultValue="cash_out">
          <option value="cash_out">Retrait (dépôt banque, remise à la gérante…)</option>
          <option value="cash_in">Apport (monnaie supplémentaire…)</option>
        </Select>
      </FormField>
      <FormField label="Montant (FCFA)" htmlFor="cm-amount" name="amount" required>
        <Input id="cm-amount" name="amount" inputMode="numeric" required />
      </FormField>
      <FormField label="Motif" htmlFor="cm-reason" name="reason" required>
        <Input id="cm-reason" name="reason" required maxLength={300} />
      </FormField>
      <SubmitButton variant="secondary">Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function CloseSessionForm({ sessionId, expected }: { sessionId: string; expected: number }) {
  const [counted, setCounted] = useState("");
  const value = parseAmount(counted);
  const diff = value === null ? null : cashDifference(expected, value);
  return (
    <ActionForm action={closeCashSession} className="flex flex-col gap-3 p-5">
      <input type="hidden" name="session_id" value={sessionId} />
      <p className="text-sm">Espèces théoriques : <strong className="tabular">{formatFCFA(expected)}</strong></p>
      <FormField label="Espèces comptées (FCFA)" htmlFor="cl-counted" name="counted_cash" required>
        <Input id="cl-counted" name="counted_cash" inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value)} required />
      </FormField>
      {diff ? (
        <p className={`text-sm font-medium ${diff.difference === 0 ? "text-success" : "text-danger"}`} role="status">
          {diff.difference === 0 ? "Aucun écart." : `Écart : ${diff.difference > 0 ? "+" : ""}${formatFCFA(diff.difference)}`}
        </p>
      ) : null}
      {diff?.needsReason ? (
        <FormField label="Motif de l'écart" htmlFor="cl-reason" name="difference_reason" required>
          <Textarea id="cl-reason" name="difference_reason" required maxLength={500} />
        </FormField>
      ) : null}
      <FormField label="Notes" htmlFor="cl-notes" name="notes">
        <Textarea id="cl-notes" name="notes" maxLength={1000} />
      </FormField>
      <SubmitButton>Clôturer la caisse</SubmitButton>
    </ActionForm>
  );
}

export function CorrectionForm({ sessionId }: { sessionId: string }) {
  return (
    <ActionForm action={correctCashSession} resetOnSuccess className="flex flex-col gap-3 p-5">
      <input type="hidden" name="session_id" value={sessionId} />
      <FormField label="Montant (+ ou −)" htmlFor="co-amount" name="amount" required hint="Ex. −500 si une sortie n'avait pas été saisie.">
        <Input id="co-amount" name="amount" inputMode="numeric" required />
      </FormField>
      <FormField label="Motif" htmlFor="co-reason" name="reason" required>
        <Textarea id="co-reason" name="reason" required maxLength={500} />
      </FormField>
      <SubmitButton variant="secondary">Enregistrer la correction</SubmitButton>
    </ActionForm>
  );
}
