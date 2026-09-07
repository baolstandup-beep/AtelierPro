'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, PageHeader, EmptyState } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function NewMeasurementPage() {
  const { id: customerId } = useParams<{ id: string }>();
  const router = useRouter();
  const { getCustomer, measurementTypes, createMeasurementProfile, addMeasurementType } = useAppStore();
  const { success, error: showError } = useToast();

  const customer = getCustomer(customerId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  if (!customer) {
    return (
      <EmptyState title="Client introuvable" />
    );
  }

  function setValue(typeId: string, val: string) {
    setValues((prev) => ({ ...prev, [typeId]: val }));
  }

  function handleAddType() {
    if (!newTypeName.trim()) return;
    const type = addMeasurementType(newTypeName.trim());
    setNewTypeName('');
    setShowAddType(false);
    success('Mesure ajoutée', `"${type.name}" est disponible`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = Object.entries(values).filter(([, v]) => v && !isNaN(Number(v)));
    if (filled.length === 0) {
      return showError('Aucune mesure', 'Renseignez au moins une mesure avant de sauvegarder.');
    }
    setLoading(true);
    try {
      const types = measurementTypes;
      createMeasurementProfile({
        customer_id: customerId,
        label: label.trim() || undefined,
        notes: notes.trim() || undefined,
        values: filled.map(([typeId, value]) => ({
          measurement_type_id: typeId,
          value: parseFloat(value),
          unit: types.find((t) => t.id === typeId)?.unit || 'cm',
        })),
      });
      success('Mesures enregistrées !');
      router.push(`/customers/${customerId}?tab=measurements`);
    } catch {
      showError('Erreur', 'Impossible d\'enregistrer les mesures.');
    } finally {
      setLoading(false);
    }
  }

  const filledCount = Object.values(values).filter((v) => v && !isNaN(Number(v))).length;

  return (
    <div className="space-y-5 max-w-lg">
      <PageHeader
        title="Nouvelles mesures"
        subtitle={customer.full_name}
        action={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
            Retour
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Étiquette (facultatif)"
            placeholder="Ex: Mesures Tabaski 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint="Aide à identifier cette prise de mesures dans l'historique."
          />

          {/* Measurements grid */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Mesures <span className="text-green-700">({filledCount} renseignée{filledCount !== 1 ? 's' : ''})</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {measurementTypes
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((type) => (
                  <div key={type.id}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {type.name} ({type.unit})
                      {type.is_custom && (
                        <span className="text-green-600 text-[10px] ml-1">✦</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="999"
                      placeholder="—"
                      value={values[type.id] || ''}
                      onChange={(e) => setValue(type.id, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Add custom measurement type */}
          {showAddType ? (
            <div className="flex gap-2 p-3 bg-green-50 rounded-lg">
              <input
                type="text"
                placeholder="Nom de la mesure (ex: Largeur dos)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddType())}
                autoFocus
              />
              <Button size="sm" type="button" onClick={handleAddType}>Ajouter</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddType(false)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddType(true)}
              className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
            >
              <Plus className="h-4 w-4" />
              Ajouter une mesure personnalisée
            </button>
          )}

          <Textarea
            label="Notes (facultatif)"
            placeholder="Observations particulières, difficultés…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button type="submit" fullWidth loading={loading} disabled={filledCount === 0}>
              Enregistrer les mesures
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
