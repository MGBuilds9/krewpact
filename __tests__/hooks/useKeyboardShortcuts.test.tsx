import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  useKeyboardShortcuts,
  ShortcutConfig,
  ChordShortcutConfig,
} from '@/hooks/useKeyboardShortcuts';

function TestComponent({
  shortcuts,
  chords = [],
}: {
  shortcuts: ShortcutConfig[];
  chords?: ChordShortcutConfig[];
}) {
  useKeyboardShortcuts(shortcuts, chords);
  return <div data-testid="container">Test</div>;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Single-key shortcuts ----

  it('fires handler on matching key', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'n', handler }]} />);
    fireEvent.keyDown(document, { key: 'n' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires metaKey when specified', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'k', metaKey: true, handler }]} />);
    fireEvent.keyDown(document, { key: 'k' });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('works with ctrlKey as meta alternative', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'k', metaKey: true, handler }]} />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires shiftKey when specified', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'n', shiftKey: true, handler }]} />);
    fireEvent.keyDown(document, { key: 'n' });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'n', shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores input elements by default', () => {
    const handler = vi.fn();
    const { getByTestId } = render(
      <>
        <TestComponent shortcuts={[{ key: 'n', handler }]} />
        <input data-testid="input" />
      </>,
    );
    const input = getByTestId('input');
    fireEvent.keyDown(input, { key: 'n' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires in input when ignoreInputs is false', () => {
    const handler = vi.fn();
    const { getByTestId } = render(
      <>
        <TestComponent shortcuts={[{ key: 'Escape', handler, ignoreInputs: false }]} />
        <input data-testid="input" />
      </>,
    );
    const input = getByTestId('input');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handles case-insensitive keys', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'N', handler }]} />);
    fireEvent.keyDown(document, { key: 'n' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('prevents default on matched shortcut', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'n', handler }]} />);
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
      cancelable: true,
    });
    const spy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('handles multiple shortcuts', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    render(
      <TestComponent
        shortcuts={[
          { key: 'n', handler: handler1 },
          { key: 'e', handler: handler2 },
        ]}
      />,
    );
    fireEvent.keyDown(document, { key: 'n' });
    fireEvent.keyDown(document, { key: 'e' });
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  // ---- Chord shortcuts ----

  it('fires chord handler on two-key sequence (G then L)', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'l' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire chord if second key is wrong', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'x' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire chord after timeout expires', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    // Advance past the chord timeout (1000ms)
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    fireEvent.keyDown(document, { key: 'l' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires chord within timeout window', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.keyDown(document, { key: 'l' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports multiple chord shortcuts with same first key', () => {
    const leadsHandler = vi.fn();
    const projectsHandler = vi.fn();
    render(
      <TestComponent
        shortcuts={[]}
        chords={[
          { firstKey: 'g', secondKey: 'l', handler: leadsHandler },
          { firstKey: 'g', secondKey: 'p', handler: projectsHandler },
        ]}
      />,
    );
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'p' });
    expect(projectsHandler).toHaveBeenCalledTimes(1);
    expect(leadsHandler).not.toHaveBeenCalled();
  });

  it('chord is case-insensitive', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'G', secondKey: 'L', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'l' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('chord ignores input elements by default', () => {
    const handler = vi.fn();
    const { getByTestId } = render(
      <>
        <TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />
        <input data-testid="input" />
      </>,
    );
    const input = getByTestId('input');
    fireEvent.keyDown(input, { key: 'g' });
    fireEvent.keyDown(input, { key: 'l' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('chord fires in input when ignoreInputs is false', () => {
    const handler = vi.fn();
    const { getByTestId } = render(
      <>
        <TestComponent
          shortcuts={[]}
          chords={[{ firstKey: 'g', secondKey: 'l', handler, ignoreInputs: false }]}
        />
        <input data-testid="input" />
      </>,
    );
    const input = getByTestId('input');
    fireEvent.keyDown(input, { key: 'g' });
    fireEvent.keyDown(input, { key: 'l' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('chord does not fire if modifier key is held on second key', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'l', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('single-key shortcut still works alongside chords', () => {
    const chordHandler = vi.fn();
    const singleHandler = vi.fn();
    render(
      <TestComponent
        shortcuts={[{ key: 'n', handler: singleHandler }]}
        chords={[{ firstKey: 'g', secondKey: 'l', handler: chordHandler }]}
      />,
    );
    fireEvent.keyDown(document, { key: 'n' });
    expect(singleHandler).toHaveBeenCalledTimes(1);
    expect(chordHandler).not.toHaveBeenCalled();
  });

  it('prevents default on chord second key', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[]} chords={[{ firstKey: 'g', secondKey: 'l', handler }]} />);
    fireEvent.keyDown(document, { key: 'g' });
    const event = new KeyboardEvent('keydown', {
      key: 'l',
      bubbles: true,
      cancelable: true,
    });
    const spy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });
});
