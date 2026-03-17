'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
}));

import {
  useAddEstimateLine,
  useCreateEstimateVersion,
  useEstimate,
  useEstimateLines,
  useEstimates,
  useEstimateVersions,
} from '@/hooks/useEstimates';
import { apiFetch } from '@/lib/api-client';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useEstimates hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEstimates', () => {
    it('calls /api/estimates with status filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useEstimates({ status: 'draft' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates', {
        params: { status: 'draft' },
      });
    });

    it('calls /api/estimates with division_id filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useEstimates({ divisionId: 'div-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates', {
        params: { division_id: 'div-1' },
      });
    });
  });

  describe('useEstimate', () => {
    it('calls /api/estimates/:id', async () => {
      const mockData = { id: 'est-1', estimate_number: 'EST-2026-001', lines: [] };
      mockApiFetch.mockResolvedValue(mockData);

      const { result } = renderHook(() => useEstimate('est-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates/est-1');
    });
  });

  describe('useEstimateLines', () => {
    it('calls /api/estimates/:id/lines', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useEstimateLines('est-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates/est-1/lines');
    });
  });

  describe('useAddEstimateLine', () => {
    it('calls POST /api/estimates/:id/lines', async () => {
      const newLine = { description: 'Labour', quantity: 10, unit_cost: 50 };
      mockApiFetch.mockResolvedValue({ id: 'line-1', ...newLine });

      const { result } = renderHook(() => useAddEstimateLine(), { wrapper: createWrapper() });

      result.current.mutate({ estimateId: 'est-1', ...newLine });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates/est-1/lines', {
        method: 'POST',
        body: { description: 'Labour', quantity: 10, unit_cost: 50 },
      });
    });
  });

  describe('useEstimateVersions', () => {
    it('calls /api/estimates/:id/versions', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useEstimateVersions('est-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates/est-1/versions');
    });
  });

  describe('useCreateEstimateVersion', () => {
    it('calls POST /api/estimates/:id/versions with reason', async () => {
      mockApiFetch.mockResolvedValue({ id: 'ver-1', revision_no: 1 });

      const { result } = renderHook(() => useCreateEstimateVersion(), { wrapper: createWrapper() });

      result.current.mutate({ estimateId: 'est-1', reason: 'Initial version' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/estimates/est-1/versions', {
        method: 'POST',
        body: { reason: 'Initial version' },
      });
    });
  });
});
