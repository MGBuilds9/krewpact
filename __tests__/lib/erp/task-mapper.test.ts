import { describe, it, expect } from 'vitest';
import { mapTaskToErp, type TaskMapInput } from '@/lib/erp/task-mapper';

function makeInput(overrides: Partial<TaskMapInput> = {}): TaskMapInput {
  return {
    id: 'task-001',
    project_id: 'proj-001',
    title: 'Install drywall — 2nd floor',
    description: 'Install drywall in all bedrooms on 2nd floor',
    status: 'todo',
    priority: 'medium',
    assigned_user_id: 'user-001',
    due_at: '2026-04-01T00:00:00Z',
    start_at: '2026-03-15T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

describe('mapTaskToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapTaskToErp(makeInput());
    expect(result.subject).toBe('Install drywall — 2nd floor');
    expect(result.description).toBe('Install drywall in all bedrooms on 2nd floor');
    expect(result.project).toBe('proj-001');
    expect(result.status).toBe('Open');
    expect(result.priority).toBe('Medium');
    expect(result.assigned_to).toBe('user-001');
    expect(result.exp_end_date).toBe('2026-04-01');
    expect(result.exp_start_date).toBe('2026-03-15');
    expect(result.krewpact_id).toBe('task-001');
  });

  it('maps in_progress status to Working', () => {
    const result = mapTaskToErp(makeInput({ status: 'in_progress' }));
    expect(result.status).toBe('Working');
  });

  it('maps blocked status to Pending Review', () => {
    const result = mapTaskToErp(makeInput({ status: 'blocked' }));
    expect(result.status).toBe('Pending Review');
  });

  it('maps done status to Completed', () => {
    const result = mapTaskToErp(makeInput({ status: 'done' }));
    expect(result.status).toBe('Completed');
  });

  it('maps cancelled status to Cancelled', () => {
    const result = mapTaskToErp(makeInput({ status: 'cancelled' }));
    expect(result.status).toBe('Cancelled');
  });

  it('maps high priority correctly', () => {
    const result = mapTaskToErp(makeInput({ priority: 'high' }));
    expect(result.priority).toBe('High');
  });

  it('maps urgent priority correctly', () => {
    const result = mapTaskToErp(makeInput({ priority: 'urgent' }));
    expect(result.priority).toBe('Urgent');
  });

  it('defaults priority to Medium when null', () => {
    const result = mapTaskToErp(makeInput({ priority: null }));
    expect(result.priority).toBe('Medium');
  });

  it('defaults assigned_to to empty string when assigned_user_id is null', () => {
    const result = mapTaskToErp(makeInput({ assigned_user_id: null }));
    expect(result.assigned_to).toBe('');
  });

  it('strips time from due_at for exp_end_date', () => {
    const result = mapTaskToErp(makeInput({ due_at: '2026-06-15T14:30:00Z' }));
    expect(result.exp_end_date).toBe('2026-06-15');
  });

  it('sets completed_on when task is done', () => {
    const result = mapTaskToErp(makeInput({ completed_at: '2026-04-05T10:00:00Z' }));
    expect(result.completed_on).toBe('2026-04-05');
  });

  it('defaults description to empty string when null', () => {
    const result = mapTaskToErp(makeInput({ description: null }));
    expect(result.description).toBe('');
  });
});
