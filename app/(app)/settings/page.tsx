'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import {
  LogOut,
  Store,
  User,
  CreditCard,
  ShieldCheck,
  Scissors,
  ArrowUpRight,
  Camera,
  Upload,
  Trash2,
  Plus,
  Image as ImageIcon,
  ShoppingBag,
  Eye,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/modal';
import type { GarmentModel } from '@/lib/types';

const CURRENCY_OPTIONS = [
  { value: 'XOF', label: 'FCFA — Franc CFA Ouest (XOF)' },
  { value: 'XAF', label: 'FCFA — Franc CFA Central (XAF)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GNF', label: 'Franc Guinéen (GNF)' },
  { value: 'MAD', label: 'Dirham Marocain (MAD)' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  XOF: 'FCFA',
  XAF: 'FCFA',
  EUR: '€',
  USD: '$',
  GNF: 'GNF',
  MAD: 'MAD',
};

const SPECIALTIES_LIST = [
  'Haute Couture Africaine',
  'Boubous & Caftans',
  'Costumes & Vestes Homme',
  'Robes de Soirée & Mariage',
  'Broderie & Finitions Main',
  'Prêt-à-porter & Wax',
  'Tenues Cérémonie Enfant',
];

const INITIAL_MODELS: GarmentModel[] = [
  {
    id: 'mod-1',
    title: 'Grand Boubou Bazin Riche Brodé',
    category: 'HOMME',
    image_url: '/images/hero-anti-master-tailor.jpg',
    price_estimate: 45000,
    fabric_suggested: 'Bazin Riche Getzner',
    description: 'Ensemble 3 pièces avec broderie col et poches fil brillant.',
  },
  {
    id: 'mod-2',
    title: 'Robe Marinière Soie & Dentelle',
    category: 'FEMME',
    image_url: '/images/carnet-mesures-gabarits.jpg',
    price_estimate: 35000,
    fabric_suggested: 'Soie brodée & Voile Suisse',
    description: 'Coupe sirène cintrée avec traîne et finitions perlées.',
  },
  {
    id: 'mod-3',
    title: 'Kaftan Royal & Pantalon Cigarette',
    category: 'HOMME',
    image_url: '/images/atelier-tailor-digital.jpg',
    price_estimate: 30000,
    fabric_suggested: 'Lin & Coton Supérieur',
    description: 'Col officier avec boutons faits main et coupe ajustée.',
  },
  {
    id: 'mod-4',
    title: 'Ensemble Cérémonie Tabaski Enfant',
    category: 'ENFANT',
    image_url: '/images/carnet-mesures-gabarits.jpg',
    price_estimate: 18000,
    fabric_suggested: 'Bazin Gagnila & Wax',
    description: 'Mini boubou 2 pièces confortable avec broderie légère.',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    currentWorkshop,
    currentUserName,
    currentUserRole,
    completeOnboarding,
    signOut,
  } = useAppStore();
  const { success, error: showError } = useToast();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [workshopSaving, setWorkshopSaving] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    'Haute Couture Africaine',
    'Boubous & Caftans',
    'Costumes & Vestes Homme',
  ]);

  const [workshopLogo, setWorkshopLogo] = useState<string | null>(
    currentWorkshop?.logo_url || null
  );

  const [workshopForm, setWorkshopForm] = useState({
    name: currentWorkshop?.name || 'Maison de Couture Diakité',
    phone: currentWorkshop?.phone || '+221 77 123 45 67',
    address: currentWorkshop?.address || 'Plateau, Rue Carnot',
    city: currentWorkshop?.city || 'Dakar',
    currency: currentWorkshop?.currency || 'XOF',
    slogan: 'L\'excellence du sur-mesure et de la haute confection.',
  });

  const [profileForm, setProfileForm] = useState({
    full_name: currentUserName && !/^user\d+$/i.test(currentUserName) ? currentUserName : 'Utilisateur AtelierPro',
  });

  // Gallery state
  const [galleryCategory, setGalleryCategory] = useState<'ALL' | 'FEMME' | 'HOMME' | 'ENFANT'>('ALL');
  const [models, setModels] = useState<GarmentModel[]>(INITIAL_MODELS);
  const [addModelModalOpen, setAddModelModalOpen] = useState(false);
  const [previewModel, setPreviewModel] = useState<GarmentModel | null>(null);

  // New Model Form State
  const [newModel, setNewModel] = useState({
    title: '',
    category: 'FEMME' as 'FEMME' | 'HOMME' | 'ENFANT',
    price_estimate: '35000',
    fabric_suggested: '',
    description: '',
    image_url: '',
  });

  const logoCameraInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const modelCameraInputRef = useRef<HTMLInputElement>(null);
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  function toggleSpecialty(spec: string) {
    if (selectedSpecialties.includes(spec)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec));
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  }

  // Handle Workshop Logo Upload & Compress
  function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
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

        const compressed = canvas.toDataURL('image/jpeg', 0.9);
        setWorkshopLogo(compressed);
        success('Photo de profil / Logo de l\'atelier mis à jour !');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Handle Model Photo Upload
  function handleModelImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 900;
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

        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setNewModel((prev) => ({ ...prev, image_url: compressed }));
        success('Photo du modèle importée !');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Add Model to Gallery
  function handleSaveNewModel(e: React.FormEvent) {
    e.preventDefault();
    if (!newModel.title.trim()) {
      showError('Titre requis', 'Veuillez nommer ce modèle de couture.');
      return;
    }
    if (!newModel.image_url) {
      showError('Photo requise', 'Veuillez ajouter une photo pour ce modèle.');
      return;
    }

    const created: GarmentModel = {
      id: `model-${Date.now()}`,
      title: newModel.title.trim(),
      category: newModel.category,
      price_estimate: parseFloat(newModel.price_estimate) || undefined,
      fabric_suggested: newModel.fabric_suggested.trim() || undefined,
      description: newModel.description.trim() || undefined,
      image_url: newModel.image_url,
      created_at: new Date().toISOString(),
    };

    setModels([created, ...models]);
    setAddModelModalOpen(false);
    setNewModel({
      title: '',
      category: 'FEMME',
      price_estimate: '35000',
      fabric_suggested: '',
      description: '',
      image_url: '',
    });
    success('Nouveau modèle ajouté à votre galerie !');
  }

  function handleDeleteModel(id: string) {
    setModels(models.filter((m) => m.id !== id));
    if (previewModel?.id === id) setPreviewModel(null);
    success('Modèle supprimé de la galerie');
  }

  async function saveWorkshop(e: React.FormEvent) {
    e.preventDefault();
    if (!workshopForm.name.trim()) return showError('Erreur', 'Le nom de l\'atelier est requis');
    setWorkshopSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    completeOnboarding({
      ...currentWorkshop,
      name: workshopForm.name.trim(),
      phone: workshopForm.phone.trim() || undefined,
      address: workshopForm.address.trim() || undefined,
      city: workshopForm.city.trim() || undefined,
      currency: workshopForm.currency,
      currency_symbol: CURRENCY_SYMBOLS[workshopForm.currency] || workshopForm.currency,
      logo_url: workshopLogo || undefined,
    });
    setWorkshopSaving(false);
    success('Paramètres et fiche de l\'atelier enregistrés avec succès !');
  }

  async function handleLogout() {
    await signOut();
    router.replace('/auth/login');
    router.refresh();
  }

  const filteredModels = models.filter((m) => {
    if (galleryCategory === 'ALL') return true;
    return m.category === galleryCategory;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* ─── Hidden Inputs for Photo Uploads ─── */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={logoCameraInputRef}
        onChange={handleLogoSelected}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={logoFileInputRef}
        onChange={handleLogoSelected}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={modelCameraInputRef}
        onChange={handleModelImageSelected}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={modelFileInputRef}
        onChange={handleModelImageSelected}
        className="hidden"
      />

      <header className="flex flex-col gap-4 border-b border-dashed border-[#C8D1CC] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">Paramètres</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[32px]">Mon atelier</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Gérez les informations et paramètres de votre atelier.</p>
        </div>
        <Button type="button" loading={workshopSaving} onClick={() => document.querySelector<HTMLFormElement>('#workshop-settings-form')?.requestSubmit()}>
          Enregistrer
        </Button>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-1" aria-label="Sections des paramètres">
        <a href="#general" className="flex h-9 items-center whitespace-nowrap rounded-lg bg-[var(--primary-subtle)] px-3.5 text-sm font-medium text-[var(--primary)]">Général</a>
        <a href="#profil" className="flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Profil</a>
        <a href="#abonnement" className="flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Abonnement</a>
        <a href="#securite" className="flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Sécurité</a>
      </nav>

      {/* ─── 2. Main Grid Layout (Fiche Atelier + Forfait) ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Workshop Identity & Specialties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Workshop Profile & Contact */}
          <div id="general" className="scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-white p-5 sm:p-6 space-y-6 text-[var(--foreground)]">
            <div className="flex items-center justify-between border-b border-[#EBE7DF] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#090F0E] text-[var(--primary)] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Fiche de l&apos;Atelier</h2>
                  <p className="text-xs text-gray-500">Coordonnées imprimées sur les reçus clients et fiches de coupe</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                ID: {currentWorkshop?.id ? currentWorkshop.id.substring(0, 8) : 'k6hbf2x2'}
              </span>
            </div>

            {/* Photo de Profil / Logo section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                  {workshopLogo ? (
                    <img src={workshopLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Photo de Profil / Logo de l&apos;Atelier</h4>
                  <p className="text-[11px] text-slate-500">Visible sur les reçus de commandes et fiches de mesures.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => logoCameraInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Camera className="w-3.5 h-3.5 text-[#0F3B32]" />
                  <span>Appareil</span>
                </button>
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Fichier</span>
                </button>
                {workshopLogo && (
                  <button
                    type="button"
                    onClick={() => setWorkshopLogo(null)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <form id="workshop-settings-form" onSubmit={saveWorkshop} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nom commercial de l'atelier"
                  value={workshopForm.name}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                  required
                  placeholder="Ex: diopcreation"
                />
                <Input
                  label="Téléphone & WhatsApp Business"
                  type="tel"
                  value={workshopForm.phone}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                  placeholder="Ex: 774752518"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Adresse physique de l'atelier"
                  value={workshopForm.address}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                  placeholder="Ex: marche ocass"
                />
                <Input
                  label="Ville & Pays"
                  value={workshopForm.city}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, city: e.target.value })}
                  placeholder="Ex: touba"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Devise de facturation"
                  options={CURRENCY_OPTIONS}
                  value={workshopForm.currency}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, currency: e.target.value })}
                />
                <Input
                  label="Slogan / Devise de l'atelier"
                  value={workshopForm.slogan}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, slogan: e.target.value })}
                  placeholder="Ex: L'excellence du sur-mesure"
                />
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Spécialités de confection de l&apos;atelier
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES_LIST.map((spec) => {
                    const active = selectedSpecialties.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => toggleSpecialty(spec)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#090F0E] text-white border-[#090F0E] font-bold shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Scissors className={`w-3 h-3 ${active ? 'text-[var(--primary)]' : 'text-gray-400'}`} />
                        <span>{spec}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  loading={workshopSaving}
                  className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Plan & Profile */}
        <div className="space-y-6">
          {/* Plan Pro Card */}
          <div id="abonnement" className="scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-white p-5 text-[var(--foreground)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                FORFAIT ACTIF
              </span>
              <CreditCard className="w-5 h-5 text-[var(--primary)]" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-serif text-[var(--foreground)]">Abonnement</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Clients illimités, carnet de mesures, gestion de production et facturation.
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--border)]">
              <p className="text-sm font-medium">Consultez votre formule actuelle et son prochain renouvellement.</p>
            </div>

            <Link
              href="/settings/billing"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#B4F73C] hover:bg-[#a1e626] text-black font-black text-xs uppercase tracking-wider transition-all"
            >
              Gérer l’abonnement <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* User Profile Card */}
          <div id="profil" className="scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-white p-5 space-y-4 text-[var(--foreground)]">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Profil Utilisateur</h3>
                <p className="text-[11px] text-gray-500 font-mono">{currentUserRole === 'OWNER' ? 'Propriétaire' : currentUserRole === 'MANAGER' ? 'Administrateur' : 'Membre'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Nom complet de l'utilisateur"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ full_name: e.target.value })}
                placeholder="Ex: talla diop"
              />
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  onClick={() => success('Profil mis à jour !')}
                >
                  Mettre à jour mon profil
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  leftIcon={<LogOut className="w-4 h-4" />}
                  onClick={() => setLogoutOpen(true)}
                >
                  Se déconnecter de l&apos;atelier
                </Button>
              </div>
            </div>
          </div>

          {/* Security & Multi-tenant Notice */}
          <div id="securite" className="scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--primary-subtle)] p-5 text-[var(--foreground)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
              <ShieldCheck className="w-4 h-4" />
              <span>Données protégées</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Les informations de votre atelier sont isolées et accessibles uniquement aux membres autorisés.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. SECTION GALERIE DE MODÈLES (Femme, Homme, Enfant) ─── */}
      <div className="rounded-[14px] border border-[var(--border)] bg-white p-5 sm:p-6 space-y-6 text-[var(--foreground)]">
        {/* Header with Title & Add Model Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE7DF] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F3B32] to-[#185c4e] text-white flex items-center justify-center shadow-md">
              <ImageIcon className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-950 font-serif-luxury">
                Galerie de Modèles & Créations
              </h2>
              <p className="text-xs text-gray-500">
                Catalogue de tenues et modèles de référence pour vos clients (Femme, Homme, Enfant)
              </p>
            </div>
          </div>

          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddModelModalOpen(true)}
            className="bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs font-bold rounded-2xl shadow-sm"
          >
            Ajouter un modèle
          </Button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: `Tous (${models.length})` },
            { id: 'FEMME', label: `Femme 👗 (${models.filter((m) => m.category === 'FEMME').length})` },
            { id: 'HOMME', label: `Homme 👔 (${models.filter((m) => m.category === 'HOMME').length})` },
            { id: 'ENFANT', label: `Enfant 🧒 (${models.filter((m) => m.category === 'ENFANT').length})` },
          ].map((tab) => {
            const active = galleryCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setGalleryCategory(tab.id as 'ALL' | 'FEMME' | 'HOMME' | 'ENFANT')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#0F3B32] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Models Grid */}
        {filteredModels.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Aucun modèle dans cette catégorie</p>
            <p className="text-xs text-slate-500 mt-1">
              Cliquez sur &laquo; Ajouter un modèle &raquo; pour importer votre première création.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Photo with Overlay Category Badge */}
                <div
                  className="relative h-48 w-full bg-slate-900 cursor-pointer overflow-hidden"
                  onClick={() => setPreviewModel(model)}
                >
                  <img
                    src={model.image_url}
                    alt={model.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-sm ${
                        model.category === 'FEMME'
                          ? 'bg-rose-500 text-white'
                          : model.category === 'HOMME'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {model.category}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Agrandir
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{model.title}</h3>
                    {model.fabric_suggested && (
                      <p className="text-[11px] font-semibold text-[#D97706] mt-0.5">
                        ✂️ {model.fabric_suggested}
                      </p>
                    )}
                    {model.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-snug">
                        {model.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Prix suggéré</span>
                      <strong className="text-xs font-mono font-bold text-[#0F3B32]">
                        {model.price_estimate ? formatCurrency(model.price_estimate, 'FCFA') : 'Sur devis'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/orders/new?model=${encodeURIComponent(model.title)}`}
                        className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-[#0F3B32] transition-colors"
                        title="Créer une commande avec ce modèle"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteModel(model.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Supprimer le modèle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: Ajouter un Nouveau Modèle (Appareil / Fichier) ─── */}
      <Modal
        open={addModelModalOpen}
        onClose={() => setAddModelModalOpen(false)}
        title="Ajouter un modèle de couture"
        size="md"
      >
        <form onSubmit={handleSaveNewModel} className="space-y-4">
          {/* Category Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catégorie de la tenue *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'FEMME', label: 'Femme 👗' },
                { id: 'HOMME', label: 'Homme 👔' },
                { id: 'ENFANT', label: 'Enfant 🧒' },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setNewModel({ ...newModel, category: cat.id as 'FEMME' | 'HOMME' | 'ENFANT' })}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    newModel.category === cat.id
                      ? 'bg-[#0F3B32] text-white border-[#0F3B32] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Title */}
          <Input
            label="Nom du modèle *"
            placeholder="Ex: Robe Sirène Bazin Riche, Grand Boubou 3 pièces..."
            value={newModel.title}
            onChange={(e) => setNewModel({ ...newModel, title: e.target.value })}
            required
          />

          {/* Photo Capture & Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Photo du modèle *
            </label>
            {newModel.image_url ? (
              <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 group shadow-inner flex items-center justify-center">
                <img
                  src={newModel.image_url}
                  alt="Aperçu modèle"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setNewModel({ ...newModel, image_url: '' })}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-md"
                  title="Supprimer la photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => modelCameraInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-green-600/40 bg-green-50/50 hover:bg-green-50 hover:border-green-600 transition-all flex flex-col items-center justify-center text-center gap-1.5"
                >
                  <Camera className="w-5 h-5 text-[#0F3B32]" />
                  <span className="text-xs font-bold text-slate-800">Prendre photo</span>
                  <span className="text-[10px] text-slate-500">Appareil photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => modelFileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-400 transition-all flex flex-col items-center justify-center text-center gap-1.5"
                >
                  <Upload className="w-5 h-5 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">Choisir fichier</span>
                  <span className="text-[10px] text-slate-500">Galerie / Image</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prix indicatif (FCFA)"
              type="number"
              min="0"
              step="500"
              value={newModel.price_estimate}
              onChange={(e) => setNewModel({ ...newModel, price_estimate: e.target.value })}
              placeholder="35000"
            />
            <Input
              label="Tissu recommandé"
              value={newModel.fabric_suggested}
              onChange={(e) => setNewModel({ ...newModel, fabric_suggested: e.target.value })}
              placeholder="Ex: Bazin, Soie, Wax..."
            />
          </div>

          <Textarea
            label="Description & détails de coupe"
            value={newModel.description}
            onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
            placeholder="Ex: Finitions fil doré, boutons recouverts, fente arrière..."
            rows={2}
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setAddModelModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#0F3B32] hover:bg-[#185c4e] text-white"
            >
              Ajouter à la galerie ✓
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: Agrandir / Zoom sur le Modèle ─── */}
      <Modal
        open={!!previewModel}
        onClose={() => setPreviewModel(null)}
        title={previewModel?.title || 'Détails du modèle'}
        size="md"
      >
        {previewModel && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 max-h-96 w-full flex items-center justify-center">
              <img
                src={previewModel.image_url}
                alt={previewModel.title}
                className="max-h-96 w-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0F3B32] text-white">
                  {previewModel.category}
                </span>
                <span className="text-sm font-mono font-bold text-[#D97706]">
                  {previewModel.price_estimate ? formatCurrency(previewModel.price_estimate, 'FCFA') : 'Sur devis'}
                </span>
              </div>

              {previewModel.fabric_suggested && (
                <p className="text-xs font-semibold text-slate-800">
                  ✂️ Tissu suggéré : {previewModel.fabric_suggested}
                </p>
              )}

              {previewModel.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {previewModel.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setPreviewModel(null)}
              >
                Fermer
              </Button>
              <Link
                href={`/orders/new?model=${encodeURIComponent(previewModel.title)}`}
                onClick={() => setPreviewModel(null)}
              >
                <Button leftIcon={<ShoppingBag className="w-4 h-4" />}>
                  Créer une commande avec ce modèle
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Confirmation Logout ─── */}
      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Déconnexion"
        description="Voulez-vous vraiment vous déconnecter de votre atelier ?"
        confirmLabel="Se déconnecter"
        variant="danger"
      />
    </div>
  );
}
