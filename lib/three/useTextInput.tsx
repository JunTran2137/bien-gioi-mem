'use client';

/**
 * useTextInput — single hidden DOM input that any 3D mesh can "focus" to capture
 * keyboard, IME (Vietnamese), and paste events. The displayed value is mirrored
 * to a `<Text>` mesh in the scene, but actual typing happens in this DOM input.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface TextInputState {
  activeId: string | null;
  values: Record<string, string>;
  focus: (id: string, opts?: { multiline?: boolean; maxLength?: number; placeholder?: string }) => void;
  blur: () => void;
  setValue: (id: string, v: string) => void;
  onSubmit: (id: string, cb: (v: string) => void) => () => void;
}

const TextInputCtx = createContext<TextInputState | null>(null);

export const useTextInput = () => {
  const ctx = useContext(TextInputCtx);
  if (!ctx) throw new Error('useTextInput must be used within TextInputProvider');
  return ctx;
};

export function TextInputProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const submitHandlers = useRef<Record<string, (v: string) => void>>({});
  const opts = useRef<{ multiline?: boolean; maxLength?: number }>({});

  const setValue = useCallback((id: string, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const focus = useCallback((id: string, o?: { multiline?: boolean; maxLength?: number; placeholder?: string }) => {
    opts.current = o || {};
    setActiveId(id);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const blur = useCallback(() => {
    setActiveId(null);
    inputRef.current?.blur();
  }, []);

  const onSubmit = useCallback((id: string, cb: (v: string) => void) => {
    submitHandlers.current[id] = cb;
    return () => {
      delete submitHandlers.current[id];
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      blur();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !opts.current.multiline) {
      e.preventDefault();
      const id = activeId;
      if (id && submitHandlers.current[id]) {
        submitHandlers.current[id](values[id] || '');
      }
    }
  };

  return (
    <TextInputCtx.Provider value={{ activeId, values, focus, blur, setValue, onSubmit }}>
      {children}
      <textarea
        ref={inputRef}
        value={(activeId && values[activeId]) || ''}
        onChange={(e) => activeId && setValue(activeId, e.target.value.slice(0, opts.current.maxLength || 1000))}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveId(null)}
        aria-hidden="true"
        tabIndex={-1}
        autoCapitalize="sentences"
        spellCheck={false}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          border: 0,
          padding: 0,
          margin: 0
        }}
      />
    </TextInputCtx.Provider>
  );
}
