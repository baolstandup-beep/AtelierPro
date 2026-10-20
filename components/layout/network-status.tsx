"use client";
import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function NetworkStatus() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="no-print sticky top-14 z-20 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm text-paper lg:top-0">
      <WifiOff className="size-4" aria-hidden />
      Hors connexion : les ventes et enregistrements sont suspendus jusqu&apos;au retour du réseau.
    </div>
  );
}
