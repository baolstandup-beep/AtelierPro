'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentStatusPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('id') || searchParams.get('order_id');
  const router = useRouter();
  
  const [status, setStatus] = useState<'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'error'>('processing');
  const [attempts, setAttempts] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status?reference=${reference}`);
        if (!res.ok) {
          if (res.status === 404) {
            // Pas encore trouvé ou mauvais user
            setAttempts(prev => prev + 1);
            return;
          }
          throw new Error('Erreur de vérification');
        }
        const data = await res.json();
        
        setStatus(data.status);
        
        if (data.status === 'paid' || data.status === 'failed' || data.status === 'cancelled') {
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else {
          setAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error('Erreur status:', error);
      }
    };

    // Premier check immédiat
    checkStatus();

    // Polling toutes les 3 secondes (max 20 essais = 1 minute)
    pollingRef.current = setInterval(() => {
      checkStatus();
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [reference]);

  useEffect(() => {
    // Arrêter le polling après 20 tentatives (1 minute)
    if (attempts >= 20 && (status === 'pending' || status === 'processing')) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setStatus('pending'); // Reste en pending mais arrête de poll
    }
  }, [attempts, status]);

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification du paiement en cours…</h2>
            <p className="text-gray-500 text-sm">Veuillez patienter pendant que nous confirmons la transaction avec le fournisseur d'accès. Cela peut prendre quelques instants.</p>
          </>
        );
      case 'paid':
        return (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement Confirmé !</h2>
            <p className="text-green-700 text-sm mb-6">Votre abonnement a été activé avec succès. Merci de votre confiance.</p>
            <Button onClick={() => router.push('/settings/billing')} className="w-full">
              Retour à la facturation
            </Button>
          </>
        );
      case 'pending':
        return (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement en attente</h2>
            <p className="text-gray-500 text-sm mb-6">Nous n'avons pas encore reçu la confirmation. Si vous avez validé le paiement sur votre mobile, l'abonnement s'activera automatiquement d'ici quelques minutes.</p>
            <Button variant="outline" onClick={() => router.push('/settings/billing')} className="w-full">
              Retourner à l'accueil
            </Button>
          </>
        );
      case 'failed':
      case 'cancelled':
      case 'error':
      default:
        return (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement échoué ou introuvable</h2>
            <p className="text-red-700 text-sm mb-6">
              {status === 'cancelled' 
                ? 'Le paiement a été annulé par l\'utilisateur.' 
                : 'Une erreur est survenue ou la référence de paiement est invalide.'}
            </p>
            <Button variant="outline" onClick={() => router.push('/settings/billing')} className="w-full">
              Réessayer le paiement
            </Button>
          </>
        );
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-lg border-gray-100">
        {renderContent()}
      </Card>
    </div>
  );
}
