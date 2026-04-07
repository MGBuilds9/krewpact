import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  forceCheck,
  getOnlineState,
  heartbeatCheck,
  startMonitoring,
  stopMonitoring,
  subscribe,
} from '@/lib/offline/online-detector';

describe('Online Detector', () => {
  beforeEach(() => {
    stopMonitoring();
    vi.restoreAllMocks();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('getOnlineState', () => {
    it('defaults to true', () => {
      expect(getOnlineState()).toBe(true);
    });
  });

  describe('heartbeatCheck', () => {
    it('returns true when fetch succeeds', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

      const result = await heartbeatCheck();
      expect(result).toBe(true);
    });

    it('returns false when fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await heartbeatCheck();
      expect(result).toBe(false);
    });

    it('returns false when server returns 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

      const result = await heartbeatCheck();
      expect(result).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = subscribe(callback);

      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('calls subscriber on state change via forceCheck', async () => {
      const callback = vi.fn();
      subscribe(callback);

      // Go offline
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
      await forceCheck();

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('does not call subscriber when state stays the same', async () => {
      // Ensure we start online
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
      await forceCheck(); // sets state to true

      const callback = vi.fn();
      subscribe(callback);

      // Stay online — should not fire since state is already true
      await forceCheck();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('forceCheck', () => {
    it('updates online state based on heartbeat result', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

      const result = await forceCheck();
      expect(result).toBe(false);
      expect(getOnlineState()).toBe(false);
    });

    it('returns true when server is reachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

      const result = await forceCheck();
      expect(result).toBe(true);
      expect(getOnlineState()).toBe(true);
    });
  });

  describe('startMonitoring / stopMonitoring', () => {
    it('adds and removes event listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      startMonitoring();
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      stopMonitoring();
      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});
