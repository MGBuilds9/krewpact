'use client';

import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  /** If true, shortcut is disabled when focus is in an input/textarea */
  ignoreInputs?: boolean;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch =
          shortcut.metaKey ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch =
          shortcut.shiftKey !== undefined ? e.shiftKey === shortcut.shiftKey : true;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          shiftMatch
        ) {
          if (shortcut.ignoreInputs !== false && isInputElement(e.target)) {
            continue;
          }
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
