'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, SectionHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ExpenseCategory, PaymentMethod } from '@/lib/types';
import {
  DollarSign,
  Plus,
  Trash2,
  Filter,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';
import { format, isThisMonth, parseISO } from 'date-fns';

const CATEGORIES: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'TISSU', label: 'Tissu & Pagne', icon: '🧵' },
  { id: 'FIL', label: 'Fil & Mercerie', icon: '🪡' },
  { id: 'MATERIEL', label: 'Matériel & Machines', icon: '✂️' },
  { id: 'TRANSPORT', label: 'Transport & Courses', icon: '🛵' },
  { id: 'LOYER', label: 'Loyer Atelier', icon: '🏠' },
  { id: 'ELECTRICITE', label: 'Électricité / Senelec', icon: '💡' },
  { id: 'SALAIRES', label: 'Salaires & Avances', icon: '👥' },
  { id: 'ENTRETIEN', label: 'Entretien & Réparation', icon: '🔧' },
  { id: 'AUTRE', label: 'Autre dépense', icon: '📦' },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'CASH', label: 'Espèces' },
  { id: 'WAVE', label: 'Wave' },
  { id: 'ORANGE_MONEY', label: 'Orange Money' },
  { id: 'BANK', label: 'Virement bancaire' },
  { id: 'OTHER', label: 'Autre' },
];

export default function ExpensesPage() {
  const { expenses, createExpense, deleteExpense, currentWorkshop } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>('TISSU');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Veuillez saisir un montant valide supérieur à zéro.');
      return;
    }
    if (!description.trim()) {
      alert('Veuillez saisir une description de la dépense.');
      return;
    }

    await createExpense({
      category,
      description: description.trim(),
      amount: parsedAmount,
      expense_date: expenseDate,
      payment_method: paymentMethod,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setCategory('TISSU');
    setShowModal(false);
  }

  // Filtrer les dépenses
  const filteredExpenses = expenses
    .filter((e) => selectedCategory === 'all' || e.category === selectedCategory)
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

  // Calculs financiers
  const currentMonthExpenses = expenses.filter((e) => {
    try {
      return isThisMonth(parseISO(e.expense_date));
    } catch {
      return false;
    }
  });

  const totalThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            Gestion des Dépenses
          </h1>
          <p className="text-sm text-gray-500">
            Suivi des charges d&apos;atelier : tissus, fils, matériel, salaires et factures
          </p>
        </div>

        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto"
        >
          Nouvelle dépense
        </Button>
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mb-1">
            <TrendingDown className="w-4 h-4" />
            Dépenses de ce mois
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalThisMonth, currentWorkshop?.currency_symbol)}
          </p>
          <p className="text-[11px] text-gray-500">{currentMonthExpenses.length} dépense(s) enregistrée(s)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4" />
            Total cumulé
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAllTime, currentWorkshop?.currency_symbol)}
          </p>
          <p className="text-[11px] text-gray-500">{expenses.length} dépense(s) au total</p>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-red-50 text-red-700 border border-red-200 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Toutes ({expenses.length})
          </button>

          {CATEGORIES.map((cat) => {
            const count = expenses.filter((e) => e.category === cat.id).length;
            if (count === 0 && selectedCategory !== cat.id) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-red-50 text-red-700 border border-red-200 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[10px] text-gray-400 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des dépenses */}
      {filteredExpenses.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Aucune dépense enregistrée</p>
            <p className="text-xs text-gray-500 mt-1">
              Enregistrez vos achats de tissus, matériel ou loyers pour un suivi clair de vos charges.
            </p>
            <div className="mt-4">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                Ajouter une dépense
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((expense) => {
            const catInfo = CATEGORIES.find((c) => c.id === expense.category);
            return (
              <div
                key={expense.id}
                className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-xl flex items-center justify-center flex-shrink-0">
                    {catInfo?.icon || '📦'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-gray-700">{catInfo?.label || expense.category}</span>
                      <span>·</span>
                      <span>{formatDate(expense.expense_date)}</span>
                      {expense.payment_method && (
                        <>
                          <span>·</span>
                          <span className="text-gray-500 font-medium">{expense.payment_method}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">
                      - {formatCurrency(expense.amount, currentWorkshop?.currency_symbol)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cette dépense ?')) {
                        deleteExpense(expense.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout de dépense */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-700" />
                Enregistrer une dépense
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-gray-900"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Libellé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5 bobines de fil, Réparation Singer..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Montant ({currentWorkshop?.currency_symbol || 'FCFA'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ex: 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mode de règlement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-gray-900"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1">
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
