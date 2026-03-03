import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello'));
    expect(result.current).toBe('hello');
  });

  it('updates value after default delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    expect(result.current).toBe('hello');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('world');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });

  it('uses custom delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('hello');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('world');
  });
});
