'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock apiFetch before importing hooks
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

import { apiFetch } from '@/lib/api-client';
import {
  useAccounts,
  useAccount,
  useCreateAccount,
  useLeads,
  useLeadStageTransition,
  usePipeline,
  useActivities,
  useCreateActivity,
} from '@/hooks/useCRM';

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

describe('useCRM hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAccounts', () => {
    it('calls /api/crm/accounts with no filters', async () => {
      const mockData = [{ id: '1', account_name: 'Test Corp' }];
      mockApiFetch.mockResolvedValue(mockData);

      const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/accounts', {
        params: {},
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('calls /api/crm/accounts with division_id filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAccounts({ divisionId: 'div-1' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/accounts', {
        params: { division_id: 'div-1' },
      });
    });

    it('calls /api/crm/accounts with search filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAccounts({ search: 'acme' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/accounts', {
        params: { search: 'acme' },
      });
    });
  });

  describe('useAccount', () => {
    it('calls /api/crm/accounts/:id', async () => {
      const mockData = { id: 'acc-1', account_name: 'Test' };
      mockApiFetch.mockResolvedValue(mockData);

      const { result } = renderHook(() => useAccount('acc-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/accounts/acc-1');
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useCreateAccount', () => {
    it('calls POST /api/crm/accounts', async () => {
      const newAccount = { account_name: 'New Corp', account_type: 'customer' };
      const created = { id: 'acc-2', ...newAccount };
      mockApiFetch.mockResolvedValue(created);

      const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

      result.current.mutate(newAccount as Parameters<typeof result.current.mutate>[0]);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/accounts', {
        method: 'POST',
        body: newAccount,
      });
    });
  });

  describe('useLeads', () => {
    it('calls /api/crm/leads with status filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(
        () => useLeads({ status: 'qualified' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/leads', {
        params: expect.objectContaining({ status: 'qualified' }),
      });
    });
  });

  describe('useLeadStageTransition', () => {
    it('calls POST /api/crm/leads/:id/stage', async () => {
      mockApiFetch.mockResolvedValue({ id: 'lead-1', status: 'qualified' });

      const { result } = renderHook(() => useLeadStageTransition(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'lead-1', stage: 'qualified' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/leads/lead-1/stage', {
        method: 'POST',
        body: { stage: 'qualified' },
      });
    });
  });

  describe('usePipeline', () => {
    it('calls /api/crm/opportunities with view=pipeline', async () => {
      const mockPipeline = { stages: {} };
      mockApiFetch.mockResolvedValue(mockPipeline);

      const { result } = renderHook(
        () => usePipeline({ divisionId: 'div-1' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/opportunities', {
        params: { view: 'pipeline', division_id: 'div-1' },
      });
    });
  });

  describe('useActivities', () => {
    it('calls /api/crm/activities with opportunity filter', async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(
        () => useActivities({ opportunityId: 'opp-1' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/activities', {
        params: { opportunity_id: 'opp-1' },
      });
    });
  });

  describe('useCreateActivity', () => {
    it('calls POST /api/crm/activities', async () => {
      const newActivity = {
        activity_type: 'call',
        title: 'Follow up call',
        opportunity_id: 'opp-1',
      };
      mockApiFetch.mockResolvedValue({ id: 'act-1', ...newActivity });

      const { result } = renderHook(() => useCreateActivity(), { wrapper: createWrapper() });

      result.current.mutate(newActivity as Parameters<typeof result.current.mutate>[0]);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith('/api/crm/activities', {
        method: 'POST',
        body: newActivity,
      });
    });
  });
});
