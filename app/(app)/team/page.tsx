'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Power,
  Phone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const ROLE_DEFINITIONS: Record<UserRole, { label: string; desc: string; badge: string }> = {
  OWNER: {
    label: 'Propriétaire',
    desc: 'Accès total, gestion financière complète et configuration',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  MANAGER: {
    label: 'Gestionnaire',
    desc: 'Gestion opérationnelle, planning, validation et finances autorisées',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  TAILOR: {
    label: 'Tailleur / Couturière',
    desc: 'Gestion des clients, mesures, commandes et étape couture',
    badge: 'bg-green-100 text-green-800 border-green-200',
  },
  CUTTER: {
    label: 'Coupeur',
    desc: 'Commandes affectées et découpe des pièces',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  CASHIER: {
    label: 'Caissier(ère)',
    desc: 'Enregistrement des acomptes, soldes et reçus de paiement',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  EMPLOYEE: {
    label: 'Apprenti(e) / Employé',
    desc: 'Accès consultation restreinte aux tâches assignées',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

export default function TeamPage() {
  const {
    members,
    inviteMember,
    updateMemberRole,
    toggleMemberStatus,
    removeMember,
    currentUserName,
    currentUserRole,
  } = useAppStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('TAILOR');

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Veuillez renseigner le nom complet du collaborateur.');
      return;
    }

    inviteMember({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      role,
    });

    setFullName('');
    setPhone('');
    setRole('TAILOR');
    setShowInviteModal(false);
  }

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const inactiveCount = members.filter((m) => m.status === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-700" />
            Gestion de l&apos;Équipe
          </h1>
          <p className="text-sm text-gray-500">
            Collaborateurs, tailleurs, coupeurs, rôles et permissions d&apos;accès
          </p>
        </div>

        <Button
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setShowInviteModal(true)}
          className="w-full sm:w-auto"
        >
          Ajouter un collaborateur
        </Button>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-green-700 text-xs font-semibold mb-1">
            <CheckCircle className="w-4 h-4" />
            Membres actifs
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-[11px] text-gray-500">connectés ou opérationnels</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
            <Power className="w-4 h-4" />
            Désactivés
          </div>
          <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
          <p className="text-[11px] text-gray-500">accès suspendus</p>
        </div>
      </div>

      {/* Guide des rôles RBAC */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-green-900 flex items-center gap-1.5 mb-2">
          <Shield className="w-4 h-4 text-green-700" />
          Rôles et Sécurité Multi-utilisateurs
        </h3>
        <p className="text-xs text-green-800 mb-3">
          Chaque employé a un rôle strict. Les tailleurs et coupeurs ne peuvent pas voir les bilans financiers ou supprimer l&apos;atelier.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(ROLE_DEFINITIONS).map(([rKey, info]) => (
            <div key={rKey} className="bg-white/80 p-2 rounded-lg border border-green-100 text-xs">
              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${info.badge}`}>
                {info.label}
              </span>
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Liste des membres */}
      <div className="space-y-3">
        {members.map((member) => {
          const profile = member.profile;
          const roleInfo = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.EMPLOYEE;
          const isOwner = member.role === 'OWNER';

          return (
            <div
              key={member.id}
              className={`p-4 bg-white rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                member.status === 'INACTIVE' ? 'opacity-60 bg-gray-50' : 'border-gray-200'
              }`}
            >
              {/* Identité */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-green-800 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {profile?.full_name || 'Utilisateur'}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                        member.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {member.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {profile?.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {profile.phone}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Ajouté le {formatDate(member.created_at)}
                  </p>
                </div>
              </div>

              {/* Contrôle du Rôle et Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                {/* Sélecteur de rôle */}
                <select
                  disabled={isOwner}
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.id, e.target.value as UserRole)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:ring-1 focus:ring-green-600 ${roleInfo.badge} ${
                    isOwner ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                  }`}
                >
                  {Object.entries(ROLE_DEFINITIONS).map(([rKey, info]) => (
                    <option key={rKey} value={rKey}>
                      {info.label}
                    </option>
                  ))}
                </select>

                {/* Bouton Activer / Désactiver */}
                {!isOwner && (
                  <button
                    onClick={() => toggleMemberStatus(member.id)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
                      member.status === 'ACTIVE'
                        ? 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                    }`}
                    title={member.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {member.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
                    </span>
                  </button>
                )}

                {/* Bouton Retirer */}
                {!isOwner && (
                  <button
                    onClick={() => {
                      if (confirm(`Retirer ${profile?.full_name || 'ce membre'} de l'atelier ?`)) {
                        removeMember(member.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                    title="Retirer le collaborateur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-green-700" />
                Inviter un collaborateur
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom et prénom du collaborateur *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Babacar Diop"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numéro de téléphone (Sénégal / International)
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +221 77 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rôle dans l&apos;atelier *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white text-gray-900"
                >
                  <option value="TAILOR">Tailleur / Couturière (Production & Mesures)</option>
                  <option value="CUTTER">Coupeur (Étape coupe & Tissus)</option>
                  <option value="MANAGER">Gestionnaire (Supervision & Clients)</option>
                  <option value="CASHIER">Caissier(ère) (Paiements & Reçus)</option>
                  <option value="EMPLOYEE">Employé(e) / Apprenti(e)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {ROLE_DEFINITIONS[role]?.desc}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1">
                  Ajouter à l&apos;équipe
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
