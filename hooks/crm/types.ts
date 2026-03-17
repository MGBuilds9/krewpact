'use client';

// Shared types used across CRM hooks

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}
