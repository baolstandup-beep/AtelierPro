'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { PageHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import {
  Ruler,
  ArrowLeft,
  User,
  Sparkles,
  Save,
  CheckCircle2,
  Plus,
  Camera,
  Upload,
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';
import { PaymentMethodIcon } from '@/components/ui/payment-method-icon';
import type { PaymentMethod, PriorityLevel, GarmentType } from '@/lib/types';

// African Tailoring Presets
const GARMENT_PRESETS = [
  {
    id: 'boubou_homme',
    label: 'Grand Boubou Homme (3 pièces)',
    garment_type: 'BOUBOU' as GarmentType,
    fields: ['Tour de cou', 'Épaule', 'Poitrine', 'Longueur boubou', 'Longueur manches', 'Tour de bras', 'Longueur pantalon', 'Tour de ceinture', 'Cuisse', 'Bas de pantalon'],
  },
  {
    id: 'kaftan_homme',
    label: 'Kaftan / Chemise Homme',
    garment_type: 'KAFTAN' as GarmentType,
    fields: ['Tour de cou', 'Épaule', 'Poitrine', 'Longueur chemise', 'Longueur manches', 'Tour de bras', 'Tour de poignet', 'Longueur pantalon'],
  },
  {
    id: 'robe_femme',
    label: 'Robe Femme / Taille Basse',
    garment_type: 'ROBE' as GarmentType,
    fields: ['Épaule', 'Poitrine', 'Taille', 'Bassin', 'Hanche', 'Longueur robe', 'Longueur manches', 'Tour de bras'],
  },
  {
    id: 'costume_ensemble',
    label: 'Costume / Ensemble Veste',
    garment_type: 'COSTUME' as GarmentType,
    fields: ['Épaule', 'Poitrine', 'Taille', 'Bassin', 'Longueur veste', 'Longueur manches', 'Longueur pantalon', 'Cuisse', 'Bas de pantalon'],
  },
  {
    id: 'pantalon_simple',
    label: 'Pantalon Seul',
    garment_type: 'PANTALON' as GarmentType,
    fields: ['Tour de ceinture', 'Bassin', 'Longueur pantalon', 'Cuisse', 'Genou', 'Bas de pantalon'],
  },
  {
    id: 'complet',
    label: 'Toutes les mesures (Fiche Complète)',
    garment_type: 'AUTRE' as GarmentType,
    fields: [],
  },
];

const POPULAR_FABRICS = [
  'Bazin Riche Getzner',
  'Bazin Gagnila',
  'Wax Hollandais Vlisco',
  'Soie Sauvage',
  'Lin & Coton',
  'Dentelle / Voile Brodé',
  'Drap de Laine (Costume)',
  'Kente / Pagne Tissé',
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon?: string; logo?: string; activeColor: string }[] = [
  {
    id: 'WAVE',
    label: 'Wave',
    logo: '/logos/wave.png',
    activeColor: 'bg-[#1DC4FF] text-white border-[#1DC4FF] shadow-sm ring-2 ring-offset-1 ring-[#1DC4FF]',
  },
  {
    id: 'ORANGE_MONEY',
    label: 'Orange Money',
    logo: '/logos/orange-money.png',
    activeColor: 'bg-black text-white border-black shadow-sm ring-2 ring-offset-1 ring-[#FF7900]',
  },
  {
    id: 'CASH',
    label: 'Espèces',
    icon: '💵',
    activeColor: 'bg-green-700 text-white border-green-700 shadow-sm ring-2 ring-offset-1 ring-green-700',
  },
  {
    id: 'BANK',
    label: 'Virement / Chèque',
    icon: '🏦',
    activeColor: 'bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-offset-1 ring-purple-700',
  },
  {
    id: 'OTHER',
    label: 'Autre',
    icon: '📱',
    activeColor: 'bg-gray-700 text-white border-gray-700 shadow-sm ring-2 ring-offset-1 ring-gray-700',
  },
];

export default function NewMeasurementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const { customers, measurementTypes, createMeasurementProfile, createOrder, currentWorkshop } = useAppStore();
  const { success, error: showError } = useToast();
  const ws = currentWorkshop;

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [selectedPreset, setSelectedPreset] = useState('boubou_homme');
  const [label, setLabel] = useState('Grand Boubou Homme');
  const [notes, setNotes] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [fabricImageUrl, setFabricImageUrl] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<Record<string, number | ''>>({});

  // Financial & Delivery State
  const [createLinkedOrder, setCreateLinkedOrder] = useState(true);
  const [totalPrice, setTotalPrice] = useState<string>('35000');
  const [advancePayment, setAdvancePayment] = useState<string>('20000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WAVE');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidden inputs for camera capture & file picking
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customer options
  const customerOptions = useMemo(() => {
    return [
      { value: '', label: 'Sélectionner un client...' },
      ...customers
        .filter((c) => !c.deleted_at)
        .map((c) => ({
          value: c.id,
          label: `${c.full_name} (${c.phone || 'Sans tel'})`,
        })),
    ];
  }, [customers]);

  // Calculations for advance & remaining balance
  const totalNum = parseFloat(totalPrice) || 0;
  const advanceNum = parseFloat(advancePayment) || 0;
  const remainingBalance = Math.max(0, totalNum - advanceNum);

  // Date shortcut helper
  function setDueInDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  }

  // Quick Advance percentage helper
  function setAdvancePercent(percent: number) {
    if (totalNum <= 0) return;
    const amount = Math.round((totalNum * percent) / 100);
    setAdvancePayment(String(amount));
  }

  // Handle Preset Change
  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    const preset = GARMENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLabel(preset.label);
    }
  }

  // Handle Photo Selection
  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('Image trop volumineuse', 'Veuillez choisir une image de moins de 10 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFabricImageUrl(compressedDataUrl);
        success('Photo du tissu ajoutée !');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Filter visible measurement types
  const visibleTypes = useMemo(() => {
    const preset = GARMENT_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset || preset.fields.length === 0) {
      return measurementTypes;
    }
    return measurementTypes.filter((t) =>
      preset.fields.some((f) => t.name.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(t.name.toLowerCase()))
    );
  }, [measurementTypes, selectedPreset]);

  function handleValueChange(typeId: string, val: string) {
    const num = val === '' ? '' : parseFloat(val);
    setMeasurementValues((prev) => ({
      ...prev,
      [typeId]: num,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCustomerId) {
      showError('Client requis', 'Veuillez sélectionner le client pour cette fiche de mesure.');
      return;
    }

    const filledValues = Object.entries(measurementValues)
      .filter(([_, val]) => typeof val === 'number' && val > 0)
      .map(([typeId, val]) => {
        const typeObj = measurementTypes.find((t) => t.id === typeId);
        return {
          measurement_type_id: typeId,
          value: val as number,
          unit: typeObj?.unit || 'cm',
        };
      });

    if (filledValues.length === 0) {
      showError('Mesures requises', 'Veuillez renseigner au moins une mesure.');
      return;
    }

    if (createLinkedOrder && totalNum <= 0) {
      showError('Prix requis', 'Veuillez renseigner le prix total de la commande.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create measurement profile
      const profile = createMeasurementProfile({
        customer_id: selectedCustomerId,
        label: label.trim() || 'Mesures générales',
        notes: notes.trim() || undefined,
        fabric_type: fabricType.trim() || undefined,
        fabric_image_url: fabricImageUrl || undefined,
        values: filledValues,
      });

      // 2. If requested, automatically create the linked order & advance payment!
      if (createLinkedOrder && totalNum > 0) {
        const preset = GARMENT_PRESETS.find((p) => p.id === selectedPreset);
        createOrder({
          customer_id: selectedCustomerId,
          due_date: dueDate || undefined,
          priority: priority,
          notes: notes.trim() ? `[Mesures: ${label}] ${notes.trim()}` : `[Mesures: ${label}]`,
          initial_payment: advanceNum > 0 ? advanceNum : undefined,
          payment_method: paymentMethod,
          items: [
            {
              name: label.trim() || 'Confection sur-mesure',
              garment_type: preset?.garment_type || 'BOUBOU',
              fabric: fabricType.trim() || undefined,
              quantity: 1,
              unit_price: totalNum,
            },
          ],
        });
        success('Fiche de mesure & Commande créées avec succès !');
      } else {
        success('Fiche de mesure enregistrée avec succès !');
      }

      router.push('/measurements');
    } catch (err: any) {
      showError('Erreur', err?.message || 'Impossible d\'enregistrer les mesures.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Back button */}
      <Link href="/measurements">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Retour au carnet de mesures
        </Button>
      </Link>

      <PageHeader
        title="Nouvelle fiche de mesures"
        subtitle="Enregistrez les mensurations, photos du tissu, avance et date de livraison."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── 1. Sélection Client ─── */}
        <Card>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-green-700" />
            1. Client
          </h3>

          <div className="space-y-3">
            <Select
              label="Sélectionnez le client"
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
            />

            {customers.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>Aucun client enregistré pour l&apos;instant.</span>
                <Link href="/customers/new">
                  <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Créer un client
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* ─── 2. Modèle & Gabarit ─── */}
        <Card>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-700" />
            2. Gabarit de couture
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
            {GARMENT_PRESETS.map((preset) => {
              const active = selectedPreset === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`p-3 text-left rounded-xl border text-xs font-semibold transition-all ${
                    active
                      ? 'bg-green-50 border-green-600 text-green-900 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <Input
            label="Libellé de la fiche (ex: Grand Boubou Bazin Riche, Robe Tabaski)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom de la tenue ou de la session..."
          />
        </Card>

        {/* ─── 3. PHOTO DU TISSU / MODÈLE (Appareil photo & Fichier) ─── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-700" />
              3. Photo du Tissu & Modèle
            </h3>
            <span className="text-[11px] text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              Mobile & Appareil Photo
            </span>
          </div>

          {/* Hidden file inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleImageSelected}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelected}
            className="hidden"
          />

          {fabricImageUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-green-600 bg-gray-900 h-56 sm:h-72 w-full flex items-center justify-center shadow-md">
                <img
                  src={fabricImageUrl}
                  alt="Photo du tissu sélectionné"
                  className="object-contain max-h-full max-w-full"
                />

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Reprendre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFabricImageUrl(null)}
                    className="p-2 rounded-xl bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  label="Type de tissu ou motif"
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value)}
                  placeholder="Ex: Bazin Riche Getzner bleu nuit..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-green-600/40 bg-green-50/50 hover:bg-green-50 hover:border-green-600 transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-950">Prendre une photo</p>
                    <p className="text-[11px] text-green-800">
                      Ouvrir l&apos;appareil photo du téléphone
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400 transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Choisir un fichier</p>
                    <p className="text-[11px] text-gray-500">
                      Galerie photo ou image de modèle
                    </p>
                  </div>
                </button>
              </div>

              <Input
                label="Type de tissu (ex: Bazin, Wax, Soie)"
                value={fabricType}
                onChange={(e) => setFabricType(e.target.value)}
                placeholder="Ex: Bazin Riche Getzner bleu nuit..."
              />
            </div>
          )}
        </Card>

        {/* ─── 4. Saisie des Mesures ─── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-green-700" />
              4. Saisie des mesures ({visibleTypes.length} points)
            </h3>
            <span className="text-xs text-gray-400 font-medium">Unité : centimètres (cm)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {visibleTypes.map((type) => {
              const val = measurementValues[type.id] ?? '';
              return (
                <div key={type.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700 block truncate">
                      {type.name}
                    </label>
                    {val !== '' && (
                      <button
                        type="button"
                        onClick={() => handleValueChange(type.id, '')}
                        title="Effacer cette mesure"
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Effacer
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="300"
                      placeholder="0.0"
                      value={val}
                      onChange={(e) => handleValueChange(type.id, e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-normal pointer-events-none">
                      {type.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <Textarea
              label="Remarques morphologiques & préférences"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Épaule droite un peu tombante, préfère les manches amples, fente de 15cm..."
              rows={2}
            />
          </div>
        </Card>

        {/* ─── 5. PAIEMENT, AVANCE, RESTANT & DATE DE LIVRAISON ─── */}
        <Card className="border-2 border-green-700/30 bg-gradient-to-b from-white to-green-50/20 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-800 text-white flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  5. Mode de Paiement, Avance & Date de Livraison
                </h3>
                <p className="text-xs text-gray-500">
                  Enregistrez l&apos;acompte et fixez la date d&apos;essayage / livraison.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-green-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createLinkedOrder}
                onChange={(e) => setCreateLinkedOrder(e.target.checked)}
                className="w-4 h-4 rounded text-green-700 focus:ring-green-700"
              />
              <span>Créer la commande</span>
            </label>
          </div>

          {createLinkedOrder && (
            <div className="space-y-6">
              {/* 5.1 Date de livraison */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-green-700" />
                  Date de livraison prévue
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-700"
                      required={createLinkedOrder}
                    />
                  </div>
                  <div className="sm:col-span-7 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDueInDays(3)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      +3 jours
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueInDays(7)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 transition-colors"
                    >
                      +1 semaine (7j)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueInDays(14)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      +2 semaines (14j)
                    </button>
                  </div>
                </div>
              </div>

              {/* 5.2 Mode de paiement de l'avance */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2">
                  Mode de paiement de l&apos;avance
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                          active
                            ? `${pm.activeColor} shadow-md`
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs'
                        }`}
                      >
                        <PaymentMethodIcon method={pm.id} size="md" />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5.3 Montants : Total, Avance & Restant Dû */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Total */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Prix Total de la confection ({ws?.currency_symbol || 'FCFA'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="35000"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-base font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                {/* Avance */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-green-900">
                      Avance versée ({ws?.currency_symbol || 'FCFA'})
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAdvancePercent(50)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdvancePercent(100)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    max={totalNum}
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    placeholder="20000"
                    className="w-full h-11 px-3 rounded-xl border-2 border-green-600 bg-green-50/50 text-base font-mono font-bold text-green-950 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                {/* Restant Dû Box */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Restant à payer
                  </span>
                  <p className="text-2xl font-black font-mono text-amber-700">
                    {formatCurrency(remainingBalance, ws?.currency_symbol)}
                  </p>
                  <span className="text-[10px] text-amber-800">
                    À régler à la livraison ({dueDate})
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ─── Submit Actions ─── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/measurements">
            <Button variant="ghost">Annuler</Button>
          </Link>
          <Button
            type="submit"
            loading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {createLinkedOrder ? 'Enregistrer Mesure & Commande ✓' : 'Enregistrer la fiche de mesure'}
          </Button>
        </div>
      </form>
    </div>
  );
}
