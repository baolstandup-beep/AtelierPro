'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { Scissors, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Veuillez entrer un email valide');
    }
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
    success('Email envoyé !', `Instructions envoyées à ${email}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-800 mb-4 shadow-lg">
            <Scissors className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AtelierPro</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email envoyé !</h2>
              <p className="text-sm text-gray-500 mb-6">
                Vérifiez votre boîte mail pour réinitialiser votre mot de passe.
              </p>
              <Link href="/auth/login" className="text-green-700 font-medium hover:underline text-sm">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Mot de passe oublié ?</h2>
              <p className="text-sm text-gray-500 mb-5">
                Entrez votre email pour recevoir les instructions de réinitialisation.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tailleur@atelier.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  required
                />
                <Button type="submit" fullWidth loading={loading} size="lg">
                  Envoyer les instructions
                </Button>
              </form>
            </>
          )}

          <div className="mt-4">
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
