"use client";
import { useState } from "react";
import type { FormAction } from "@/lib/action-types";
import { ActionForm, FormField } from "./action-form";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Textarea } from "./field";
import { SubmitButton } from "./submit-button";


/** Opération sensible : confirmation explicite, motif éventuellement obligatoire. */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirmLabel,
  hidden,
  reason,
  variant = "danger",
  triggerVariant = "secondary",
  children,
}: {
  action: FormAction;
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  hidden?: Record<string, string>;
  reason?: { label: string; required?: boolean };
  variant?: "danger" | "primary";
  triggerVariant?: "secondary" | "ghost" | "danger" | "primary";
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <ActionForm action={action} onSuccess={() => setOpen(false)} className="flex flex-col gap-4">
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {children}
          {reason ? (
            <FormField label={reason.label} htmlFor="confirm-reason" name="reason" required={reason.required}>
              <Textarea id="confirm-reason" name="reason" required={reason.required} maxLength={500} />
            </FormField>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Retour
            </Button>
            <SubmitButton variant={variant}>{confirmLabel}</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
