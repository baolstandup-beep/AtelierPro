import React from 'react';
import Link from 'next/link';

export default function SuppressionCompte() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#111827] py-20 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-[0_4px_20px_rgba(15,59,50,0.04)] border border-[#E7E2D8]">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F3B32] font-serif-luxury mb-8">
          Suppression de Compte & Données
        </h1>
        
        <div className="space-y-6 text-sm text-[#4B5563] leading-relaxed">
          <section>
            <p>Conformément aux réglementations sur la protection des données personnelles, vous disposez d'un droit de suppression intégrale de vos données et de celles de votre atelier sur AtelierPro.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">Comment supprimer votre compte ?</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Connectez-vous à votre espace AtelierPro.</li>
              <li>Allez dans le menu <strong>Paramètres</strong> {'>'}  <strong>Mon Atelier</strong>.</li>
              <li>En bas de la page, cliquez sur <strong>Supprimer mon atelier et mon compte</strong>.</li>
              <li>Une confirmation par mot de passe vous sera demandée.</li>
            </ol>
            <p className="mt-2 text-red-600 font-semibold">⚠️ Attention : Cette action est irréversible. Toutes les fiches clients, commandes et mesures seront définitivement effacées.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">Délai de traitement</h2>
            <p>La suppression de la base de données est immédiate. Les sauvegardes chiffrées automatiques (backups) sont purgées dans un délai maximum de 30 jours.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">Assistance</h2>
            <p>Si vous n'arrivez pas à accéder à votre compte pour le supprimer, contactez-nous via WhatsApp au +221 77 303 31 96 en précisant votre numéro de téléphone d'inscription.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#E7E2D8]">
          <Link href="/" className="text-[#D97706] font-semibold hover:underline">
            &larr; Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
