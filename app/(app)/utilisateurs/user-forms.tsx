"use client";
import { useState } from "react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUser, resetUserPassword, updateUser } from "@/lib/actions/users";
import { ROLE_DEFAULTS, type Role } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/format";

type Catalog = { key: string; label: string; module: string }[];

function PermissionPicker({ role, selected, catalog }: { role: Role; selected: string[]; catalog: Catalog }) {
  if (role === "admin") return <p className="text-sm text-muted">L&apos;administrateur dispose de toutes les permissions.</p>;
  const defaults = new Set<string>(ROLE_DEFAULTS[role]);
  const modules = [...new Set(catalog.map((c) => c.module))];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Permissions</legend>
      {modules.map((m) => (
        <div key={m}>
          <p className="mb-1 text-xs text-muted">{m}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {catalog.filter((c) => c.module === m).map((c) =>
              defaults.has(c.key) ? (
                <Checkbox key={c.key} checked disabled readOnly label={<span className="text-muted">{c.label} (rôle)</span>} />
              ) : (
                <Checkbox key={c.key} name="permissions" value={c.key} defaultChecked={selected.includes(c.key)} label={c.label} />
              ),
            )}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

export function CreateUserForm({ catalog }: { catalog: Catalog }) {
  const [role, setRole] = useState<Role>("cashier");
  return (
    <ActionForm action={createUser} resetOnSuccess className="flex flex-col gap-4 p-5">
      <FormField label="Nom complet" htmlFor="u-name" name="full_name" required><Input id="u-name" name="full_name" required /></FormField>
      <FormField label="E-mail de connexion" htmlFor="u-email" name="email" required><Input id="u-email" name="email" type="email" required autoComplete="off" /></FormField>
      <FormField label="Téléphone" htmlFor="u-phone" name="phone"><Input id="u-phone" name="phone" type="tel" /></FormField>
      <FormField label="Rôle" htmlFor="u-role" name="role">
        <Select id="u-role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField label="Mot de passe provisoire" htmlFor="u-pass" name="password" required hint="10 caractères minimum.">
        <Input id="u-pass" name="password" type="text" required minLength={10} autoComplete="new-password" />
      </FormField>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Permissions supplémentaires</summary>
        <div className="mt-3"><PermissionPicker role={role} selected={[]} catalog={catalog} /></div>
      </details>
      <SubmitButton>Créer le compte</SubmitButton>
    </ActionForm>
  );
}

export function EditUserButton({ user, catalog }: { user: { id: string; full_name: string; phone: string | null; role: Role; permissions: string[]; is_active: boolean }; catalog: Catalog }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Gérer</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={user.full_name} className="w-[min(40rem,calc(100vw-2rem))]">
        <ActionForm action={updateUser} onSuccess={() => setOpen(false)} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={user.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nom complet" htmlFor={`eu-name-${user.id}`} name="full_name" required><Input id={`eu-name-${user.id}`} name="full_name" defaultValue={user.full_name} required /></FormField>
            <FormField label="Téléphone" htmlFor={`eu-phone-${user.id}`} name="phone"><Input id={`eu-phone-${user.id}`} name="phone" defaultValue={user.phone ?? ""} /></FormField>
            <FormField label="Rôle" htmlFor={`eu-role-${user.id}`} name="role">
              <Select id={`eu-role-${user.id}`} name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <div className="flex items-end"><Checkbox name="is_active" defaultChecked={user.is_active} label="Compte actif" /></div>
          </div>
          <PermissionPicker role={role} selected={user.permissions} catalog={catalog} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
        <ActionForm action={resetUserPassword} resetOnSuccess className="mt-6 flex flex-wrap items-end gap-2 border-t border-sand pt-4">
          <input type="hidden" name="id" value={user.id} />
          <FormField label="Nouveau mot de passe provisoire" htmlFor={`rp-${user.id}`} name="password" className="flex-1">
            <Input id={`rp-${user.id}`} name="password" type="text" minLength={10} autoComplete="new-password" />
          </FormField>
          <SubmitButton variant="secondary">Réinitialiser</SubmitButton>
        </ActionForm>
      </Dialog>
    </>
  );
}
