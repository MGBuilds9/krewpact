'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface ShortcutConfig {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  /** If true, shortcut is disabled when focus is in an input/textarea */
  ignoreInputs?: boolean;
}

/**
 * Chord shortcut: two-keystroke sequence (e.g., G then L).
 * No modifier keys on either keystroke — just plain keys in sequence.
 */
export interface ChordShortcutConfig {
  firstKey: string;
  secondKey: string;
  handler: () => void;
  /** If true, shortcut is disabled when focus is in an input/textarea. Default: true */
  ignoreInputs?: boolean;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

/** Timeout (ms) for the second key in a chord sequence */
const CHORD_TIMEOUT = 1000;

type TimeoutRef = ReturnType<typeof setTimeout> | null;
type PendingChord = { key: string; timestamp: number } | null;

function clearChordState(
  pendingRef: React.MutableRefObject<PendingChord>,
  timeoutRef: React.MutableRefObject<TimeoutRef>,
) {
  pendingRef.current = null;
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function tryCompleteChord(
  e: KeyboardEvent,
  chords: ChordShortcutConfig[],
  pendingKey: string,
  inInput: boolean,
): ChordShortcutConfig | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  for (const chord of chords) {
    const keyMatch =
      pendingKey === chord.firstKey.toLowerCase() &&
      e.key.toLowerCase() === chord.secondKey.toLowerCase();
    if (keyMatch && !(chord.ignoreInputs !== false && inInput)) return chord;
  }
  return null;
}

function trySingleShortcut(
  e: KeyboardEvent,
  shortcuts: ShortcutConfig[],
  inInput: boolean,
): ShortcutConfig | null {
  for (const shortcut of shortcuts) {
    const metaMatch = shortcut.metaKey ? e.metaKey || e.ctrlKey : true;
    const shiftMatch = shortcut.shiftKey !== undefined ? e.shiftKey === shortcut.shiftKey : true;
    if (e.key.toLowerCase() !== shortcut.key.toLowerCase() || !metaMatch || !shiftMatch) continue;
    if (shortcut.ignoreInputs !== false && inInput) continue;
    return shortcut;
  }
  return null;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  chords: ChordShortcutConfig[] = [],
) {
  const pendingChordRef = useRef<PendingChord>(null);
  const chordTimeoutRef = useRef<TimeoutRef>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const inInput = isInputElement(e.target);

      if (pendingChordRef.current) {
        const { key, timestamp } = pendingChordRef.current;
        const elapsed = Date.now() - timestamp;
        if (elapsed < CHORD_TIMEOUT) {
          const matched = tryCompleteChord(e, chords, key, inInput);
          if (matched) {
            e.preventDefault();
            clearChordState(pendingChordRef, chordTimeoutRef);
            matched.handler();
            return;
          }
        }
        clearChordState(pendingChordRef, chordTimeoutRef);
      }

      if (chords.length > 0 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const chordsWithKey = chords.filter(
          (c) => c.firstKey.toLowerCase() === e.key.toLowerCase(),
        );
        if (chordsWithKey.length > 0) {
          const allIgnoreInput = chordsWithKey.every((c) => c.ignoreInputs !== false);
          if (!(allIgnoreInput && inInput)) {
            pendingChordRef.current = { key: e.key.toLowerCase(), timestamp: Date.now() };
            chordTimeoutRef.current = setTimeout(() => {
              pendingChordRef.current = null;
              chordTimeoutRef.current = null;
            }, CHORD_TIMEOUT);
            return;
          }
        }
      }

      const matched = trySingleShortcut(e, shortcuts, inInput);
      if (matched) {
        e.preventDefault();
        matched.handler();
      }
    },
    [shortcuts, chords],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (chordTimeoutRef.current) {
        clearTimeout(chordTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);
}
