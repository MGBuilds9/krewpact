'use client';

import type { PortalMilestone, PortalTask, ProgressSummary } from '@/hooks/usePortalProject';

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function MilestoneItem({ milestone, tasks }: { milestone: PortalMilestone; tasks: PortalTask[] }) {
  const milestoneTasks = tasks.filter((t) => t.milestone_id === milestone.id);
  const isComplete = milestone.status === 'completed';
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-CA') : '—');

  return (
    <div className="relative pl-8">
      <div
        className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isComplete ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
        }`}
        aria-hidden="true"
      >
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="pb-6">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p
              className={`text-sm font-semibold ${isComplete ? 'text-gray-500 line-through' : 'text-gray-900'}`}
            >
              {milestone.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isComplete
                ? `Completed ${fmt(milestone.completed_at)}`
                : `Due ${fmt(milestone.due_date)}`}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
              isComplete
                ? 'bg-green-50 text-green-700'
                : milestone.status === 'in_progress'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-600'
            }`}
          >
            {milestone.status.replace('_', ' ')}
          </span>
        </div>
        {milestoneTasks.length > 0 && (
          <ul className="mt-2 space-y-1">
            {milestoneTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-400' : 'bg-gray-300'
                  }`}
                />
                {task.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ProgressTimelineProps {
  milestones: PortalMilestone[];
  tasks: PortalTask[];
  summary: ProgressSummary;
}

export function ProgressTimeline({ milestones, tasks, summary }: ProgressTimelineProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Overall Progress</p>
          <p className="text-sm font-semibold text-blue-700">{summary.completion_pct}%</p>
        </div>
        <ProgressBar pct={summary.completion_pct} />
        <p className="text-xs text-gray-400 mt-2">
          {summary.completed_milestones} of {summary.total_milestones} milestones complete
        </p>
      </div>
      {milestones.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No milestones defined yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />
          {milestones.map((m) => (
            <MilestoneItem key={m.id} milestone={m} tasks={tasks} />
          ))}
        </div>
      )}
    </div>
  );
}
