import Link from 'next/link';

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#111827] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-[#EBE7DF]">
        <h1 className="text-3xl font-black text-[#0F3B32] mb-6 font-serif-luxury">Politique de Confidentialité</h1>
        
        <div className="prose prose-slate prose-green max-w-none text-sm leading-relaxed">
          <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
          
          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">1. Données collectées</h2>
          <p>
            Dans le cadre de l'utilisation d'AtelierPro, nous collectons les données suivantes :
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Données de compte :</strong> nom, email, téléphone de l'atelier.</li>
            <li><strong>Données métier :</strong> informations de vos clients, mesures, commandes, fichiers médias (photos des modèles et tissus).</li>
            <li><strong>Données techniques :</strong> logs de connexion, appareils utilisés.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">2. Utilisation de vos données</h2>
          <p>
            Vos données sont exclusivement utilisées pour :
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Fournir, maintenir et améliorer le service AtelierPro.</li>
            <li>Assurer la sécurité de votre compte et prévenir la fraude.</li>
            <li>Générer vos reçus, notifications et factures.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">3. Sécurité et Hébergement</h2>
          <p>
            La sécurité de vos données est notre priorité absolue. Vos données sont hébergées dans des centres de données sécurisés (via Supabase / AWS). L'accès aux données est strictement cloisonné par atelier grâce à des politiques de sécurité "Row Level Security" (RLS). En d'autres termes, <strong>personne d'autre que les membres autorisés de votre atelier ne peut accéder à vos données</strong>.
          </p>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">4. Partage des données</h2>
          <p>
            <strong>Nous ne vendrons, ne louerons ni ne partagerons jamais vos données métier à des tiers à des fins publicitaires.</strong> Les seules données partagées le sont avec nos prestataires techniques strictement nécessaires au fonctionnement de l'application (hébergement, passerelles de paiement).
          </p>

          <h2 className="text-xl font-bold text-[#0F3B32] mt-8 mb-4">5. Vos droits</h2>
          <p>
            Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification, d'effacement et d'export de vos données. Vous pouvez exercer ce droit à tout moment depuis les paramètres de votre compte ou en nous contactant directement.
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
