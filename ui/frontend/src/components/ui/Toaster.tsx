'use client';

import {BellRing, CheckCircle2, Info, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import {useApp, type Toast} from '@/providers/AppProvider';
import styles from './controls.module.css';

function ToastItem({toast}: {toast: Toast}) {
  const {dismissToast} = useApp();
  const common = useTranslations('common');
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration ?? 4_500);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toast.duration, toast.id]);

  const Icon = toast.tone === 'reminder' ? BellRing : toast.tone === 'success' ? CheckCircle2 : Info;

  return (
    <motion.div
      animate={{opacity: 1, y: 0, scale: 1}}
      className={styles.toast}
      data-tone={toast.tone ?? 'neutral'}
      exit={{opacity: 0, y: 10, scale: 0.98}}
      initial={{opacity: 0, y: 16, scale: 0.98}}
      layout
      role={toast.tone === 'reminder' ? 'alert' : 'status'}
    >
      <span className={styles.toastIcon}><Icon size={18} /></span>
      <p>{toast.message}</p>
      {toast.actionLabel && (
        <button
          className={styles.toastAction}
          onClick={() => {
            toast.onAction?.();
            if (toast.href) router.push(toast.href);
            dismissToast(toast.id);
          }}
          type="button"
        >
          {toast.actionLabel}
        </button>
      )}
      <button aria-label={common('close')} className={styles.toastClose} onClick={() => dismissToast(toast.id)} type="button"><X size={15} /></button>
    </motion.div>
  );
}

export function Toaster() {
  const {toasts} = useApp();
  return (
    <div aria-live="polite" className={styles.toaster}>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}
      </AnimatePresence>
    </div>
  );
}
