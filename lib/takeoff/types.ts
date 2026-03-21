// ============================================================
// Engine API types (what the engine returns)
// ============================================================

export interface EngineCreateJobResponse {
  job_id: string;
}

export interface EngineJobStatus {
  id: string;
  status: string;
  progress?: number;
  error?: string;
  started_at?: string;
  completed_at?: string;
  summary?: {
    total_pages: number;
    plan_pages: number;
    lines_extracted: number;
    processing_time_ms: number;
  };
}

export interface EnginePageResult {
  page_number: number;
  page_type: string; // 'plan' | 'elevation' | 'section' | 'detail' | 'schedule' | 'spec' | 'cover' | 'other'
  page_type_confidence: number;
  scale?: string;
  thumbnail_url?: string;
  extraction_data?: Record<string, unknown>;
}

export interface EngineDraftLine {
  trade: string;
  csi_code?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_cost?: number;
  cost_source?: string;
  confidence: number;
  source_pages: number[];
  source_regions?: Record<string, unknown>[];
  notes?: string;
}

export interface EngineFeedbackItem {
  draft_line_id?: string;
  feedback_type: FeedbackType;
  original_value?: Record<string, unknown>;
  corrected_value?: Record<string, unknown>;
}

// ============================================================
// KrewPact domain types
// ============================================================

export type TakeoffJobStatus =
  | 'pending'
  | 'processing'
  | 'classifying'
  | 'extracting'
  | 'costing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const ACTIVE_JOB_STATUSES: TakeoffJobStatus[] = [
  'pending',
  'processing',
  'classifying',
  'extracting',
  'costing',
];

export const TERMINAL_JOB_STATUSES: TakeoffJobStatus[] = ['completed', 'failed', 'cancelled'];

export type DraftLineReviewStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export type FeedbackType = 'accepted' | 'corrected' | 'rejected' | 'missed';

export interface TakeoffJobConfig {
  engine_job_id?: string;
  callback_url?: string;
  callback_token?: string;
  [key: string]: unknown;
}

// Metadata shape stored on accepted estimate_lines
export interface TakeoffLineMetadata {
  source: 'ai_takeoff';
  takeoff_job_id: string;
  takeoff_draft_line_id: string;
  trade: string;
  csi_code?: string;
  confidence: number;
  source_pages: number[];
}
