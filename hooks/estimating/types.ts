'use client';

// --- Paginated Response ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// --- Types ---

export interface CostCatalogItem {
  id: string;
  division_id: string | null;
  item_code: string | null;
  item_name: string;
  item_type: string;
  unit: string;
  base_cost: number;
  vendor_name: string | null;
  effective_from: string;
  effective_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Assembly {
  id: string;
  division_id: string | null;
  assembly_code: string | null;
  assembly_name: string;
  description: string | null;
  unit: string;
  version_no: number;
  is_active: boolean;
  created_by: string | null;
  assembly_items?: AssemblyItem[];
  created_at: string;
  updated_at: string;
}

export interface AssemblyItem {
  id: string;
  assembly_id: string;
  catalog_item_id: string | null;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EstimateTemplate {
  id: string;
  division_id: string | null;
  template_name: string;
  project_type: string | null;
  payload: Record<string, unknown>;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateAlternate {
  id: string;
  estimate_id: string;
  title: string;
  description: string | null;
  amount: number;
  selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstimateAllowance {
  id: string;
  estimate_id: string;
  allowance_name: string;
  allowance_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Filter interfaces ---

export interface CostCatalogFilters {
  divisionId?: string;
  itemType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AssemblyFilters {
  divisionId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EstimateTemplateFilters {
  divisionId?: string;
  projectType?: string;
  limit?: number;
  offset?: number;
}
