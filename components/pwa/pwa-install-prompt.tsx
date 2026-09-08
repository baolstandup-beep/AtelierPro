'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export function PWAInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default true to prevent flash
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Expose global handlers for hero buttons
    (window as any).__atelierProInstallIOS = () => {
      if (isIosDevice) setShowPrompt(true);
      else alert('Pour installer sur iPhone, ouvrez ce site dans Safari et appuyez sur "Partager" > "Sur l\'écran d\'accueil".');
    };
    (window as any).__atelierProInstallAndroid = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        alert('Pour installer sur Android : appuyez sur le menu de Chrome (⋮) et sélectionnez "Installer l\'application".');
      }
    };

    if (isIosDevice) {
      // For iOS, we just show our custom instructions
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        // Delay showing to not interrupt immediate UX
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    // Detect Android/Chrome installability
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] bg-white border border-[#E7E2D8] shadow-2xl rounded-2xl p-4 sm:p-5"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 bg-[#0F3B32] rounded-xl flex items-center justify-center text-white shadow-md">
              <Download className="w-6 h-6 text-[#D97706]" />
            </div>
            
            <div className="flex-1 pr-6">
              <h4 className="font-bold text-[#0F3B32] text-sm mb-1">Installer AtelierPro</h4>
              
              {isIOS ? (
                <div className="text-xs text-[#4B5563] space-y-2 mt-2">
                  <p>Installez l'application pour un accès rapide et hors-ligne :</p>
                  <ol className="list-decimal pl-4 space-y-1 font-medium">
                    <li className="flex items-center gap-1.5">Appuyez sur <Share className="w-3.5 h-3.5 inline text-blue-500" /> (Partager)</li>
                    <li className="flex items-center gap-1.5">Choisissez <PlusSquare className="w-3.5 h-3.5 inline" /> <strong>Sur l'écran d'accueil</strong></li>
                  </ol>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#4B5563] mb-3">
                    Installez l'application pour un accès rapide, hors-ligne et sécurisé depuis votre écran d'accueil.
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2 bg-[#0F3B32] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#185c4e] transition-colors"
                  >
                    Installer l'application
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
