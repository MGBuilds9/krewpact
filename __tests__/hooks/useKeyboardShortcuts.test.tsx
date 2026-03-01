import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function TestComponent({
  shortcuts,
}: {
  shortcuts: Parameters<typeof useKeyboardShortcuts>[0];
}) {
  useKeyboardShortcuts(shortcuts);
  return <div data-testid="container">Test</div>;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fires handler on matching key', () => {
    const handler = vi.fn();
    render(<TestComponent shortcuts={[{ key: 'n', handler }]} />);
    fireEvent.keyDown(document, { key: 'n' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires metaKey when specified', () => {
    const handler = vi.fn();
    render(
      <TestComponent shortcuts={[{ key: 'k', metaKey: true, handler }]} />,
    );
    fireEvent.keyDown(document, { key: 'k' });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('works with ctrlKey as meta alternative', () => {
    const handler = vi.fn();
    render(
      <TestComponent shortcuts={[{ key: 'k', metaKey: true, handler }]} />,
    );
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires shiftKey when specified', () => {
    const handler = vi.fn();
    render(
      <TestComponent
        shortcuts={[{ key: 'n', shiftKey: true, handler }]}
      />,
    );
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
        <TestComponent
          shortcuts={[{ key: 'Escape', handler, ignoreInputs: false }]}
        />
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
});
