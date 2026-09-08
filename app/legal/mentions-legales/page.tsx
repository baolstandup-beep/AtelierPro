import React from 'react';
import Link from 'next/link';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#111827] py-20 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-[0_4px_20px_rgba(15,59,50,0.04)] border border-[#E7E2D8]">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F3B32] font-serif-luxury mb-8">
          Mentions Légales
        </h1>
        
        <div className="space-y-6 text-sm text-[#4B5563] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">1. Éditeur du service</h2>
            <p>AtelierPro est édité par la société [Nom de votre entreprise], immatriculée au Registre du Commerce sous le numéro [Numéro de registre].</p>
            <p>Siège social : [Adresse physique de l'entreprise].</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">2. Hébergement</h2>
            <p>L'application AtelierPro est hébergée par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.</p>
            <p>Les données sont stockées de manière sécurisée par Supabase (AWS), conformes aux normes internationales de protection des données.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">3. Propriété Intellectuelle</h2>
            <p>La marque AtelierPro, le code source, les logos, et l'interface utilisateur sont la propriété exclusive de [Nom de votre entreprise]. Toute reproduction, distribution ou modification sans autorisation écrite préalable est strictement interdite.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F3B32] mb-2">4. Contact</h2>
            <p>Pour toute question ou demande légale, vous pouvez nous contacter à l'adresse e-mail suivante : [Votre adresse e-mail de contact] ou par téléphone au +221 77 303 31 96.</p>
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
