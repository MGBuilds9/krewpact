import { fireEvent, render } from '@testing-library/react';
import React, { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandKeyboardRefs, useCommandKeyboard } from '@/hooks/useCommandKeyboard';

function makeRefs(overrides: Partial<CommandKeyboardRefs> = {}): CommandKeyboardRefs {
  return {
    scrollAreaRef: { current: null },
    flatResultsRef: { current: [] },
    filteredNavItemsRef: { current: [] },
    selectedIndexRef: { current: 0 },
    handleNavigationRef: { current: vi.fn() },
    handleEntityNavigationRef: { current: vi.fn() },
    onCloseRef: { current: vi.fn() },
    ...overrides,
  };
}

function TestHarness({
  isOpen,
  refs,
  onIndexChange,
}: {
  isOpen: boolean;
  refs: CommandKeyboardRefs;
  onIndexChange?: (i: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const dispatch: React.Dispatch<React.SetStateAction<number>> = (action) => {
    const next = typeof action === 'function' ? action(index) : action;
    setIndex(next);
    onIndexChange?.(next);
  };
  useCommandKeyboard(isOpen, dispatch, refs);
  return <div data-testid="harness" />;
}

describe('useCommandKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onClose on Escape', () => {
    const refs = makeRefs();
    render(<TestHarness isOpen refs={refs} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(refs.onCloseRef.current).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Cmd+K', () => {
    const refs = makeRefs();
    render(<TestHarness isOpen refs={refs} />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(refs.onCloseRef.current).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Ctrl+K', () => {
    const refs = makeRefs();
    render(<TestHarness isOpen refs={refs} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(refs.onCloseRef.current).toHaveBeenCalledTimes(1);
  });

  it('does not handle keys when closed', () => {
    const refs = makeRefs();
    render(<TestHarness isOpen={false} refs={refs} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(refs.onCloseRef.current).not.toHaveBeenCalled();
  });

  it('increments selectedIndex on ArrowDown', () => {
    const refs = makeRefs({
      flatResultsRef: {
        current: [{ entityType: 'leads', result: { id: '1', name: 'A', subtitle: null } }],
      },
      filteredNavItemsRef: { current: [{ href: '/crm', label: 'CRM', icon: () => null }] },
    });
    const onIndexChange = vi.fn();
    render(<TestHarness isOpen refs={refs} onIndexChange={onIndexChange} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('does not go below 0 on ArrowUp', () => {
    const refs = makeRefs({
      flatResultsRef: {
        current: [{ entityType: 'leads', result: { id: '1', name: 'A', subtitle: null } }],
      },
      filteredNavItemsRef: { current: [] },
    });
    const onIndexChange = vi.fn();
    render(<TestHarness isOpen refs={refs} onIndexChange={onIndexChange} />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('calls handleEntityNavigation on Enter when flat result selected', () => {
    const handleEntityNavigation = vi.fn();
    const flatResult = {
      entityType: 'leads' as const,
      result: { id: 'lead-1', name: 'Lead', subtitle: null },
    };
    const refs = makeRefs({
      flatResultsRef: { current: [flatResult] },
      filteredNavItemsRef: { current: [] },
      selectedIndexRef: { current: 0 },
      handleEntityNavigationRef: { current: handleEntityNavigation },
    });
    render(<TestHarness isOpen refs={refs} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handleEntityNavigation).toHaveBeenCalledWith('leads', 'lead-1');
  });

  it('calls handleNavigation on Enter when nav item selected', () => {
    const handleNavigation = vi.fn();
    const refs = makeRefs({
      flatResultsRef: { current: [] },
      filteredNavItemsRef: { current: [{ href: '/crm/leads', label: 'Leads', icon: () => null }] },
      selectedIndexRef: { current: 0 },
      handleNavigationRef: { current: handleNavigation },
    });
    render(<TestHarness isOpen refs={refs} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handleNavigation).toHaveBeenCalledWith('/crm/leads');
  });

  it('does not exceed total items count on ArrowDown', () => {
    const refs = makeRefs({
      flatResultsRef: {
        current: [{ entityType: 'leads', result: { id: '1', name: 'A', subtitle: null } }],
      },
      filteredNavItemsRef: { current: [{ href: '/crm', label: 'CRM', icon: () => null }] },
    });
    const indices: number[] = [];
    render(<TestHarness isOpen refs={refs} onIndexChange={(i) => indices.push(i)} />);
    // Press ArrowDown 5 times — max is totalItems - 1 = 1
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    expect(Math.max(...indices)).toBe(1);
  });
});
