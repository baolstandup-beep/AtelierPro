"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Lecture par caméra. Utilise l'API native BarcodeDetector lorsqu'elle existe
 * (Chrome Android), sinon la bibliothèque ZXing. Nécessite HTTPS et une
 * autorisation explicite de l'utilisateur.
 */
export function CameraScanner({ open, onClose, onDetected }: { open: boolean; onClose: () => void; onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;

    const finish = (code: string) => {
      if (stopped) return;
      stopped = true;
      onDetected(code);
      onClose();
    };

    (async () => {
      setError(null);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Ce navigateur ou cette connexion (HTTPS requis) ne permet pas d'utiliser la caméra. Utilisez un lecteur de codes-barres ou la saisie manuelle.");
        return;
      }
      try {
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        if (BD) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          const video = videoRef.current!;
          video.srcObject = stream;
          await video.play();
          const detector = new BD({ formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "qr_code"] });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) return finish(codes[0].rawValue);
            } catch {
              /* image suivante */
            }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          zxingControls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result) => {
            if (result) finish(result.getText());
          });
        }
      } catch (e) {
        const name = (e as { name?: string }).name;
        setError(
          name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur pour ce site."
            : name === "NotFoundError"
              ? "Aucune caméra détectée sur cet appareil."
              : "Impossible de démarrer la caméra sur cet appareil.",
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, [open, onClose, onDetected]);

  return (
    <Dialog open={open} onClose={onClose} title="Scanner avec la caméra" description="Placez le code-barres dans le cadre.">
      {error ? (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-md bg-ink">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-gold/80" aria-hidden />
        </div>
      )}
    </Dialog>
  );
}
