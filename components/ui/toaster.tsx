'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Toast Context ────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Return a safe fallback so calling toast outside never crashes
    return {
      toast: () => {},
      success: (title: string, description?: string) => console.log(`[Toast Success] ${title}`, description),
      error: (title: string, description?: string) => console.error(`[Toast Error] ${title}`, description),
      warning: (title: string, description?: string) => console.warn(`[Toast Warning] ${title}`, description),
      info: (title: string, description?: string) => console.info(`[Toast Info] ${title}`, description),
    };
  }
  return ctx;
}

// ─── Toast Provider ───────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { ...opts, id }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const ctx: ToastContextValue = React.useMemo(() => ({
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    warning: (title, description) => addToast({ type: 'warning', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
  }), [addToast]);

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colors: Record<ToastType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-orange-500',
    info: 'bg-blue-600',
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-24 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl shadow-lg border border-gray-200 flex items-start gap-3 p-3 pointer-events-auto animate-in slide-in-from-bottom-2 duration-200"
          >
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0', colors[t.type])}>
              {icons[t.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{t.title}</p>
              {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toaster() {
  return null;
}
