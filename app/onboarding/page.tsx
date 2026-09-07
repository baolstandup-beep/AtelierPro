'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { Scissors, Check, Store, Phone, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const CURRENCIES = [
  { value: 'XOF', label: 'FCFA — Franc CFA Ouest (XOF)' },
  { value: 'XAF', label: 'FCFA — Franc CFA Central (XAF)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GNF', label: 'Franc Guinéen (GNF)' },
  { value: 'MAD', label: 'Dirham Marocain (MAD)' },
  { value: 'DZD', label: 'Dinar Algérien (DZD)' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  XOF: 'FCFA', XAF: 'FCFA', EUR: '€', USD: '$', GNF: 'GNF', MAD: 'MAD', DZD: 'DZD',
};

const STEPS = [
  { id: 1, label: 'Bienvenue' },
  { id: 2, label: 'Votre atelier' },
  { id: 3, label: 'Terminé' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { currentUserName, completeOnboarding } = useAppStore();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'Dakar',
    currency: 'XOF',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Le nom de l'atelier est requis";
    if (!form.phone.trim()) errs.phone = 'Le téléphone est requis';
    return errs;
  }

  async function handleComplete() {
    const errs = validateStep2();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 600));
      completeOnboarding({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        currency: form.currency,
        currency_symbol: CURRENCY_SYMBOLS[form.currency] || form.currency,
      });
      setStep(3);
    } catch {
      showError("Erreur", "Impossible de créer l'atelier. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    success("C'est parti !", `Bienvenue dans AtelierPro`);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-800 mb-3">
            <Scissors className="text-white w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-green-700">AtelierPro</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step > s.id ? 'bg-green-800 text-white' :
                step === s.id ? 'bg-green-800 text-white ring-4 ring-green-100' :
                'bg-gray-200 text-gray-500'
              )}>
                {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-8', step > s.id ? 'bg-green-800' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div>
              <div className="text-center py-4 mb-5">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Bonjour, {currentUserName || 'Tailleur'} !
                </h2>
                <p className="text-sm text-gray-500">
                  Bienvenue dans AtelierPro. En quelques étapes, nous allons configurer votre espace de travail.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: '👥', text: 'Gérez vos clients et leurs mesures' },
                  { icon: '📋', text: 'Suivez vos commandes de A à Z' },
                  { icon: '💰', text: 'Gardez le contrôle de vos paiements' },
                  { icon: '📱', text: 'Tout sur votre téléphone' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-xl">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              <Button fullWidth size="lg" onClick={() => setStep(2)}>
                Commencer →
              </Button>
            </div>
          )}

          {/* Step 2: Workshop info */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Votre atelier</h2>
              <p className="text-sm text-gray-500 mb-5">Ces informations pourront être modifiées plus tard dans Paramètres.</p>

              <div className="space-y-4">
                <Input
                  label="Nom de l'atelier"
                  placeholder="Ex: Couture Prestige Dakar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={errors.name}
                  required
                  leftElement={<Store className="h-4 w-4" />}
                />
                <Input
                  label="Téléphone"
                  type="tel"
                  placeholder="+221 77 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  error={errors.phone}
                  required
                  leftElement={<Phone className="h-4 w-4" />}
                />
                <Input
                  label="Adresse (facultatif)"
                  placeholder="Rue 12, Médina"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  leftElement={<MapPin className="h-4 w-4" />}
                />
                <Input
                  label="Ville"
                  placeholder="Dakar"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <Select
                  label="Devise"
                  options={CURRENCIES}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button fullWidth loading={loading} onClick={handleComplete}>
                  Créer mon atelier
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Votre atelier est prêt !
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                <strong className="text-gray-800">{form.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Vous pouvez maintenant ajouter vos clients, créer des commandes et suivre votre production.
              </p>
              <Button fullWidth size="lg" onClick={goToDashboard}>
                Accéder au Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
