"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/** Fenêtre modale basée sur <dialog> (focus piégé et Échap gérés par le navigateur). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-sand bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/50",
        className,
      )}
      aria-labelledby="dialog-title"
    >
      {open ? (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="font-display text-2xl">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-sand/60 hover:text-ink" aria-label="Fermer">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
