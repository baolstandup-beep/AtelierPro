'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, PageHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { ArrowLeft } from 'lucide-react';
import type { GenderType } from '@/lib/types';
import { ClientLimitModal } from '@/components/billing/client-limit-modal';
import { PlanQuotaWidget } from '@/components/billing/plan-quota-widget';

const GENDER_OPTIONS = [
  { value: '', label: 'Non précisé' },
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const { createCustomer, customers } = useAppStore();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gender: '' as GenderType | '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2)
      errs.full_name = 'Le nom est requis (2 caractères minimum)';
    if (!form.phone.trim())
      errs.phone = 'Le numéro de téléphone est requis';
    else if (!/^[\d\s\+\-\(\)]{7,20}$/.test(form.phone.trim()))
      errs.phone = 'Numéro de téléphone invalide';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      // Normalisation de sécurité
      const normalizedGender =
        typeof form.gender === 'string'
          ? form.gender.trim().toLowerCase()
          : null;

      const safeGender: GenderType | undefined =
        normalizedGender === 'homme' || normalizedGender === 'femme'
          ? (normalizedGender as GenderType)
          : undefined;

      const customer = await createCustomer({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        gender: safeGender,
        notes: form.notes.trim() || undefined,
      });
      success('Client créé !', `${customer.full_name} a été ajouté.`);
      router.push(`/customers/${customer.id}`);
    } catch (err: any) {
      if (err?.code === 'FREE_PLAN_CLIENT_LIMIT_REACHED' || err?.message?.includes('FREE_PLAN_CLIENT_LIMIT_REACHED')) {
        setIsLimitModalOpen(true);
      } else {
        showError('Erreur', err?.message || "Impossible de créer le client. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <ClientLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        currentCount={customers.length}
      />

      <PlanQuotaWidget
        currentCount={customers.length}
        onUpgradeClick={() => setIsLimitModalOpen(true)}
      />

      <PageHeader
        title="Nouveau client"
        action={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
            Retour
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom complet"
            placeholder="Mamadou Diallo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            error={errors.full_name}
            required
            autoCapitalize="words"
          />
          <Input
            label="Téléphone"
            type="tel"
            placeholder="+221 77 123 45 67"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            required
          />
          <Input
            label="Email (facultatif)"
            type="email"
            placeholder="client@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ville"
              placeholder="Dakar"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Select
              label="Genre"
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as GenderType })}
            />
          </div>
          <Input
            label="Adresse (facultatif)"
            placeholder="Rue 12, Médina"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Textarea
            label="Notes internes (facultatif)"
            placeholder="Informations utiles sur ce client…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button type="submit" fullWidth loading={loading}>
              Créer le client
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
