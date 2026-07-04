'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Variant = 'default' | 'success' | 'error' | 'warning' | 'danger';

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: Variant;
  duration: number;
}

type ToastInput = {
  title: string;
  description?: string;
  variant?: Variant;
  duration?: number;
};

let _push: ((t: ToastInput) => void) | null = null;
export function toast(input: ToastInput) {
  if (_push) _push(input);
  else if (typeof window !== 'undefined') console.log('[toast]', input);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    _push = (t: ToastInput) => {
      const id = Date.now() + Math.random();
      const full: Toast = {
        duration: 4000,
        variant: 'default',
        ...t,
        id
      } as Toast;
      setToasts(prev => [...prev, full]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), full.duration);
    };
    return () => {
      _push = null;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed right-4 top-20 z-[200] flex w-full max-w-sm flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'pointer-events-auto surface-card flex items-start gap-3 p-4',
              t.variant === 'success' && 'border-l-4 border-l-primary',
              (t.variant === 'error' || t.variant === 'danger') && 'border-l-4 border-l-danger',
              t.variant === 'warning' && 'border-l-4 border-l-accent'
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-primary" />}
              {(t.variant === 'error' || t.variant === 'danger') && <XCircle className="h-5 w-5 text-danger" />}
              {t.variant === 'warning' && <AlertTriangle className="h-5 w-5 text-accent" />}
              {(!t.variant || t.variant === 'default') && <Info className="h-5 w-5 text-secondary" />}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-text">{t.title}</div>
              {t.description && <div className="mt-0.5 text-muted">{t.description}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
