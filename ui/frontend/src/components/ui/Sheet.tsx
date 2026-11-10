'use client';

import {X} from 'lucide-react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {useEffect, useId, useRef, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import styles from './controls.module.css';

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  closeLabel: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'regular' | 'wide';
}

/** A side panel on desktop and a bottom sheet on phones. Escape or the backdrop closes it. */
export function Sheet({open, onClose, title, subtitle, leading, closeLabel, footer, children, size = 'regular'}: SheetProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => panel.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div animate={{opacity: 1}} className={styles.sheetBackdrop} exit={{opacity: 0}} initial={{opacity: 0}} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.div
            animate={{x: 0, y: 0, opacity: 1}}
            aria-labelledby={titleId}
            aria-modal="true"
            className={size === 'wide' ? styles.sheetWide : styles.sheet}
            exit={reduceMotion ? {opacity: 0} : {opacity: 0, y: 24}}
            initial={reduceMotion ? {opacity: 0} : {opacity: 0, y: 24}}
            ref={panel}
            role="dialog"
            tabIndex={-1}
            transition={{type: 'spring', stiffness: 320, damping: 32}}
          >
            <header className={styles.sheetHeader}>
              {leading}
              <div className={styles.sheetTitle}>
                <h2 id={titleId}>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button aria-label={closeLabel} className={styles.iconButton} onClick={onClose} type="button"><X size={19} /></button>
            </header>
            <div className={styles.sheetBody}>{children}</div>
            {footer && <footer className={styles.sheetFooter}>{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
