export interface FlowStep {
  id: string;
  step_number: number;
  action_type: 'email' | 'task' | 'wait' | 'condition';
  action_config: Record<string, unknown>;
  condition_type?: string | null;
  condition_config?: Record<string, unknown> | null;
  true_next_step_id?: string | null;
  false_next_step_id?: string | null;
  position_x: number;
  position_y: number;
  delay_days?: number;
  delay_hours?: number;
}

export interface FlowConnection {
  from_step_id: string;
  to_step_id: string;
  label?: string; // 'Yes' / 'No' for conditions
}
