"use client";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSettings } from "@/lib/actions/settings";

type Settings = { shop_name: string; address: string | null; phone: string | null; email: string | null; legal_info: string | null; receipt_footer: string; allow_negative_stock: boolean; max_discount_percent: number; default_min_stock: number };

export function SettingsForm({ settings }: { settings: Settings }) {
  return (
    <ActionForm action={saveSettings} className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="Coordonnées (ticket)" />
        <div className="flex flex-col gap-4 p-5">
          <FormField label="Nom de la boutique" htmlFor="shop_name" name="shop_name" required><Input id="shop_name" name="shop_name" defaultValue={settings.shop_name} required /></FormField>
          <FormField label="Adresse" htmlFor="address" name="address"><Input id="address" name="address" defaultValue={settings.address ?? ""} /></FormField>
          <FormField label="Téléphone" htmlFor="phone" name="phone"><Input id="phone" name="phone" defaultValue={settings.phone ?? ""} /></FormField>
          <FormField label="E-mail" htmlFor="email" name="email"><Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} /></FormField>
          <FormField label="Mentions légales" htmlFor="legal_info" name="legal_info" hint="NINEA, RCCM…"><Input id="legal_info" name="legal_info" defaultValue={settings.legal_info ?? ""} /></FormField>
          <FormField label="Message de fin de ticket" htmlFor="receipt_footer" name="receipt_footer" required><Textarea id="receipt_footer" name="receipt_footer" defaultValue={settings.receipt_footer} required /></FormField>
        </div>
      </Panel>
      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHeader title="Règles de caisse et de stock" />
          <div className="flex flex-col gap-4 p-5">
            <FormField label="Remise maximale sans administrateur (%)" htmlFor="max_discount_percent" name="max_discount_percent" hint="Au-delà, seule la gérante peut accorder la remise.">
              <Input id="max_discount_percent" name="max_discount_percent" type="number" min={0} max={100} defaultValue={settings.max_discount_percent} />
            </FormField>
            <FormField label="Seuil de stock faible par défaut" htmlFor="default_min_stock" name="default_min_stock">
              <Input id="default_min_stock" name="default_min_stock" type="number" min={0} defaultValue={settings.default_min_stock} />
            </FormField>
            <div className="rounded-md border border-warning/40 bg-warning-soft/50 p-3">
              <Checkbox name="allow_negative_stock" defaultChecked={settings.allow_negative_stock} label="Autoriser exceptionnellement les ventes en stock négatif" />
              <p className="mt-1.5 text-xs text-warning">À n&apos;activer que temporairement (ex. articles reçus mais pas encore saisis). Option journalisée.</p>
            </div>
          </div>
        </Panel>
        <SubmitButton size="lg">Enregistrer les réglages</SubmitButton>
      </div>
    </ActionForm>
  );
}
