'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PageHeader, Card, Avatar, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toaster';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  Ruler,
  Search,
  Plus,
  Printer,
  ShoppingBag,
  User,
  Calendar,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  Share2,
  Camera,
  Image as ImageIcon,
  Tag,
  Trash2,
} from 'lucide-react';
import type { MeasurementProfile, Customer } from '@/lib/types';

export default function MeasurementsPage() {
  const router = useRouter();
  const { measurementProfiles, customers, measurementTypes, currentWorkshop, deleteMeasurementProfile } = useAppStore();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [selectedProfile, setSelectedProfile] = useState<MeasurementProfile | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<MeasurementProfile | null>(null);

  // Group profiles with customer data
  const enrichedProfiles = useMemo(() => {
    return measurementProfiles.map((p) => {
      const customer = customers.find((c) => c.id === p.customer_id);
      return {
        ...p,
        customer,
      };
    });
  }, [measurementProfiles, customers]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return enrichedProfiles.filter((p) => {
      const matchSearch =
        search === '' ||
        (p.customer?.full_name && p.customer.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (p.customer?.phone && p.customer.phone.includes(search)) ||
        (p.label && p.label.toLowerCase().includes(search.toLowerCase())) ||
        (p.fabric_type && p.fabric_type.toLowerCase().includes(search.toLowerCase()));

      const matchGender =
        genderFilter === 'ALL' ||
        (genderFilter === 'MALE' && p.customer?.gender === 'MALE') ||
        (genderFilter === 'FEMALE' && p.customer?.gender === 'FEMALE');

      return matchSearch && matchGender;
    });
  }, [enrichedProfiles, search, genderFilter]);

  function handleOpenDetail(profile: MeasurementProfile) {
    setSelectedProfile(profile);
    setDetailModalOpen(true);
  }

  function handlePrint() {
    window.print();
  }

  const selectedCustomer = selectedProfile
    ? customers.find((c) => c.id === selectedProfile.customer_id)
    : null;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <PageHeader
        title="Carnet de mesures & Gabarits"
        subtitle={`${enrichedProfiles.length} fiche${enrichedProfiles.length > 1 ? 's' : ''} de mesure enregistrée${enrichedProfiles.length > 1 ? 's' : ''}`}
        action={
          <Link href="/measurements/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Nouvelle mesure
            </Button>
          </Link>
        }
      />

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Rechercher par nom client, téléphone, modèle ou tissu (Bazin, Wax...)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGenderFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              genderFilter === 'ALL'
                ? 'bg-[#0F3B32] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tous ({enrichedProfiles.length})
          </button>
          <button
            onClick={() => setGenderFilter('MALE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              genderFilter === 'MALE'
                ? 'bg-[#0F3B32] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Hommes
          </button>
          <button
            onClick={() => setGenderFilter('FEMALE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              genderFilter === 'FEMALE'
                ? 'bg-[#0F3B32] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Femmes
          </button>
        </div>
      </div>

      {/* ─── List of Measurement Sheets ─── */}
      {filteredProfiles.length === 0 ? (
        <EmptyState
          icon={<Ruler className="w-10 h-10 text-gray-400" />}
          title="Aucune fiche de mesure trouvée"
          description={
            search
              ? 'Aucune mesure ne correspond à votre recherche.'
              : 'Commencez par enregistrer les mensurations et le tissu de votre premier client.'
          }
          action={
            <Link href="/measurements/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Prendre des mesures
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProfiles.map((p) => {
            const cust = p.customer;
            const values = p.values || [];
            return (
              <Card
                key={p.id}
                className="hover:border-[#0F3B32]/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                onClick={() => handleOpenDetail(p)}
              >
                <div>
                  {/* Top Customer Info */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={cust?.full_name || 'Client'} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#0F3B32] transition-colors">
                          {cust?.full_name || 'Client inconnu'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {cust?.phone ? formatPhone(cust.phone) : 'Sans téléphone'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] border border-[#0F3B32]/15">
                          {p.label || 'Mesures générales'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmProfile(p);
                          }}
                          title="Supprimer cette fiche de mesure"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {p.fabric_type && (
                        <span className="text-[10px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                          ✂️ {p.fabric_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fabric Photo Thumbnail preview if present */}
                  {p.fabric_image_url && (
                    <div className="mt-3 flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-800">
                        <img
                          src={p.fabric_image_url}
                          alt="Tissu"
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-slate-800 truncate">
                          {p.fabric_type || 'Photo du tissu attachée'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Cliquez pour agrandir le coupon
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Measurement Badges Preview */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 my-3.5">
                    {values.slice(0, 4).map((v) => (
                      <div
                        key={v.id || v.measurement_type_id}
                        className="bg-gray-50 rounded-lg p-2 border border-gray-100"
                      >
                        <span className="text-[10px] text-gray-500 block truncate">
                          {v.measurement_type?.name || 'Mesure'}
                        </span>
                        <strong className="text-xs font-mono font-bold text-gray-900">
                          {v.value} {v.unit}
                        </strong>
                      </div>
                    ))}
                    {values.length > 4 && (
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500 font-semibold">
                          +{values.length - 4} autres
                        </span>
                      </div>
                    )}
                  </div>

                  {p.notes && (
                    <p className="text-xs text-gray-500 bg-amber-50/60 border border-amber-100 rounded-lg p-2 mb-2 line-clamp-2">
                      <strong className="text-amber-800 font-medium">Note :</strong> {p.notes}
                    </p>
                  )}
                </div>

                {/* Footer Info & CTA */}
                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(p.taken_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#0F3B32] font-medium group-hover:underline flex items-center gap-0.5">
                      Consulter la fiche <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Detail / Print Modal ─── */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Fiche de Mesures"
        size="lg"
      >
        {selectedProfile && selectedCustomer && (
          <div className="space-y-6 print:p-4">
            {/* Atelier & Client Header */}
            <div className="flex items-start justify-between bg-[#EBF7F1] p-4 rounded-2xl border border-[#0F3B32]/15">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0F3B32]">
                  {currentWorkshop?.name || 'AtelierPro'}
                </p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedCustomer.full_name}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Tél : {formatPhone(selectedCustomer.phone)}
                  {selectedCustomer.city ? ` • ${selectedCustomer.city}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0F3B32] text-white">
                  {selectedProfile.label || 'Fiche standard'}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">
                  Prise le {formatDate(selectedProfile.taken_at)}
                </p>
              </div>
            </div>

            {/* Fabric Image & Type (if attached) */}
            {(selectedProfile.fabric_image_url || selectedProfile.fabric_type) && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#0F3B32]" />
                  Tissu & Modèle de Référence
                </h4>

                {selectedProfile.fabric_type && (
                  <p className="text-xs font-semibold text-[#D97706] mb-3">
                    Type : {selectedProfile.fabric_type}
                  </p>
                )}

                {selectedProfile.fabric_image_url && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 max-h-80 w-full bg-slate-900 flex items-center justify-center">
                    <img
                      src={selectedProfile.fabric_image_url}
                      alt="Photo du tissu"
                      className="object-contain max-h-80 w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Measurement Points Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#0F3B32]" />
                Mensurations du Client ({selectedProfile.values?.length || 0} points)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(selectedProfile.values || []).map((v) => (
                  <div
                    key={v.id || v.measurement_type_id}
                    className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-600 font-medium">
                      {v.measurement_type?.name || 'Point de mesure'}
                    </span>
                    <strong className="text-sm font-mono font-bold text-[#0F3B32]">
                      {v.value} <span className="text-[10px] text-gray-500 font-normal">{v.unit}</span>
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes if any */}
            {selectedProfile.notes && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold mb-0.5">Remarques & morphologie :</p>
                <p className="text-amber-800">{selectedProfile.notes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 print:hidden">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteConfirmProfile(selectedProfile)}
                >
                  Supprimer la fiche
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                >
                  Imprimer
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Fermer
                </Button>
                <Link href={`/orders/new?customerId=${selectedCustomer.id}`}>
                  <Button
                    size="sm"
                    leftIcon={<ShoppingBag className="w-4 h-4" />}
                  >
                    Créer une commande
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        open={!!deleteConfirmProfile}
        onClose={() => setDeleteConfirmProfile(null)}
        title="Supprimer la mesure"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer définitivement cette fiche de mesure{' '}
            {deleteConfirmProfile?.label ? <strong>« {deleteConfirmProfile.label} »</strong> : ''} ?
          </p>
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            Cette action est irréversible. Les valeurs associées à cette fiche seront effacées.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmProfile(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                if (deleteConfirmProfile) {
                  deleteMeasurementProfile(deleteConfirmProfile.id);
                  if (selectedProfile?.id === deleteConfirmProfile.id) {
                    setDetailModalOpen(false);
                    setSelectedProfile(null);
                  }
                  setDeleteConfirmProfile(null);
                  success('Mesure supprimée', 'La fiche de mesure a bien été supprimée.');
                }
              }}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
