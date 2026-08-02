'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/components/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { bar: string; icon: ReactNode }> = {
  success: { bar: 'from-accent-400 to-accent-600', icon: <CheckCircle2 className="h-5 w-5 text-accent-600" aria-hidden="true" /> },
  error: { bar: 'from-primary-500 to-primary-800', icon: <XCircle className="h-5 w-5 text-primary-700" aria-hidden="true" /> },
  info: { bar: 'from-secondary-400 to-secondary-600', icon: <Info className="h-5 w-5 text-secondary-600" aria-hidden="true" /> },
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="glass-panel pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl2 p-3.5 pr-8 shadow-lifted"
            >
              <span className={cn('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', KIND_STYLES[t.kind].bar)} />
              {KIND_STYLES[t.kind].icon}
              <p className="text-sm font-medium text-primary-800">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 rounded-full p-1 text-primary-400 hover:bg-primary-50 hover:text-primary-700"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}