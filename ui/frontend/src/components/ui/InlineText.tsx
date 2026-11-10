'use client';

import {Check, Pencil} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import styles from './inline.module.css';

interface InlineTextProps {
  value: string;
  onSave: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  validate?: (value: string) => boolean;
  display?: string;
  size?: 'md' | 'lg';
}

/** Shows a value as text; tap to edit in place. Enter or leaving the field saves, Escape cancels. */
export function InlineText({value, onSave, label, placeholder, disabled = false, inputMode, validate, display, size = 'md'}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  function beginEditing() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim().replace(/\s+/g, ' ');
    setEditing(false);
    if (next === value || (validate && !validate(next))) {
      setDraft(value);
      return;
    }
    onSave(next);
  }

  if (disabled) {
    return <span className={styles.readOnly} data-size={size}>{display ?? (value || placeholder)}</span>;
  }

  if (!editing) {
    return (
      <button aria-label={`${label}: ${display ?? value}`} className={styles.display} data-empty={!value ? 'true' : undefined} data-size={size} onClick={beginEditing} type="button">
        <span>{display ?? (value || placeholder)}</span>
        <Pencil aria-hidden="true" size={size === 'lg' ? 15 : 13} />
      </button>
    );
  }

  return (
    <span className={styles.editing} data-size={size}>
      <input
        aria-label={label}
        inputMode={inputMode}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        ref={input}
        value={draft}
      />
      <button aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={commit} type="button"><Check size={15} /></button>
    </span>
  );
}
