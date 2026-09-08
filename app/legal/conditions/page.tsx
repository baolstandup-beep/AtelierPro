import Link from 'next/link';

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#111827] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-[#EBE7DF]">
        <h1 className="text-3xl font-black text-[#0F3B32] mb-6 font-serif-luxury">Conditions Générales d'Utilisation</h1>
        
        <div className="prose prose-slate prose-green max-w-none text-sm leading-relaxed">
          <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
          
          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">1. Acceptation des conditions</h2>
          <p>
            En accédant et en utilisant l'application AtelierPro, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
          </p>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">2. Description du service</h2>
          <p>
            AtelierPro est un logiciel SaaS (Software as a Service) destiné à la gestion des ateliers de couture professionnels. Le service permet la gestion des clients, des mesures, des commandes, de la production et de la facturation.
          </p>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">3. Inscription et Sécurité du compte</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Vous devez fournir des informations exactes et complètes lors de la création de votre compte.</li>
            <li>Vous êtes responsable de la sécurité de votre mot de passe et de votre compte.</li>
            <li>Vous devez nous informer immédiatement de toute utilisation non autorisée de votre compte.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">4. Utilisation et Données</h2>
          <p>
            Vos données métier (clients, commandes, revenus) vous appartiennent. Nous mettons en œuvre des mesures de sécurité avancées (chiffrement, RLS) pour garantir que chaque atelier n'a accès qu'à ses propres données. Vous êtes néanmoins responsable de la légalité des données que vous importez ou créez sur la plateforme.
          </p>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">5. Résiliation</h2>
          <p>
            Nous nous réservons le droit de suspendre ou de résilier votre accès à nos services en cas de violation de ces CGU, de non-paiement, ou d'utilisation abusive de la plateforme.
          </p>

          <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between items-center">
            <Link href="/" className="text-[#0F3B32] font-semibold hover:underline">
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
