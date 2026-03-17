import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ProjectHealthCard,
  type ProjectHealthCardProps,
} from '@/components/Dashboard/ProjectHealthCard';

function renderCard(overrides: Partial<ProjectHealthCardProps> = {}) {
  const defaultProps: ProjectHealthCardProps = {
    projectName: 'Office Renovation',
    projectNumber: 'PRJ-001',
    healthScore: 85,
    healthStatus: 'green',
    milestoneTotal: 10,
    milestoneCompleted: 7,
    overdueTaskCount: 0,
    daysSinceLastLog: 1,
    ...overrides,
  };
  return render(<ProjectHealthCard {...defaultProps} />);
}

describe('ProjectHealthCard', () => {
  it('renders project name and number', () => {
    renderCard();
    expect(screen.getByText('Office Renovation')).toBeDefined();
    expect(screen.getByText('PRJ-001')).toBeDefined();
  });

  it('renders health score badge with green status', () => {
    renderCard({ healthScore: 85, healthStatus: 'green' });
    const badge = screen.getByTestId('health-badge');
    expect(badge.textContent).toContain('Healthy');
    expect(badge.textContent).toContain('85%');
  });

  it('renders health score badge with yellow status', () => {
    renderCard({ healthScore: 65, healthStatus: 'yellow' });
    const badge = screen.getByTestId('health-badge');
    expect(badge.textContent).toContain('At Risk');
    expect(badge.textContent).toContain('65%');
  });

  it('renders health score badge with red status', () => {
    renderCard({ healthScore: 30, healthStatus: 'red' });
    const badge = screen.getByTestId('health-badge');
    expect(badge.textContent).toContain('Critical');
    expect(badge.textContent).toContain('30%');
  });

  it('renders milestone progress correctly', () => {
    renderCard({ milestoneTotal: 10, milestoneCompleted: 7 });
    expect(screen.getByText('7/10')).toBeDefined();
    const progress = screen.getByTestId('milestone-progress');
    expect(progress).toBeDefined();
  });

  it('renders zero milestone progress', () => {
    renderCard({ milestoneTotal: 5, milestoneCompleted: 0 });
    expect(screen.getByText('0/5')).toBeDefined();
  });

  it('renders overdue task count with singular form', () => {
    renderCard({ overdueTaskCount: 1 });
    const overdue = screen.getByTestId('overdue-count');
    expect(overdue.textContent).toContain('1 overdue task');
  });

  it('renders overdue task count with plural form', () => {
    renderCard({ overdueTaskCount: 3 });
    const overdue = screen.getByTestId('overdue-count');
    expect(overdue.textContent).toContain('3 overdue tasks');
  });

  it('renders zero overdue tasks', () => {
    renderCard({ overdueTaskCount: 0 });
    const overdue = screen.getByTestId('overdue-count');
    expect(overdue.textContent).toContain('0 overdue tasks');
  });

  it('renders "Logged today" when daysSinceLastLog is 0', () => {
    renderCard({ daysSinceLastLog: 0 });
    const log = screen.getByTestId('last-log');
    expect(log.textContent).toContain('Logged today');
  });

  it('renders days since last log', () => {
    renderCard({ daysSinceLastLog: 5 });
    const log = screen.getByTestId('last-log');
    expect(log.textContent).toContain('5d ago');
  });

  it('renders "No logs" when daysSinceLastLog is null', () => {
    renderCard({ daysSinceLastLog: null });
    const log = screen.getByTestId('last-log');
    expect(log.textContent).toContain('No logs');
  });

  it('renders the card container with data-testid', () => {
    renderCard();
    expect(screen.getByTestId('project-health-card')).toBeDefined();
  });
});
