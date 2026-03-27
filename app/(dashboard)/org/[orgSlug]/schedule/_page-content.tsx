'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { type Task, useTasks } from '@/hooks/useTasks';

import { CalendarCard, getMonthDays } from './_components/CalendarCard';
import { ScheduleStats } from './_components/ScheduleStats';
import { UpcomingTasks } from './_components/UpcomingTasks';

export default function SchedulePage() {
  const { data: tasks, isLoading } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      overdue: tasks.filter((t) => t.due_at && t.due_at < todayStr && t.status !== 'done').length,
    };
  }, [tasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.due_at && t.status !== 'done')
      .sort((a, b) => (a.due_at! > b.due_at! ? 1 : -1))
      .slice(0, 10);
  }, [tasks]);

  const tasksByDate = useMemo(() => {
    if (!tasks) return new Map<string, Task[]>();
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_at) continue;
      const dateKey = task.due_at.split('T')[0];
      const existing = map.get(dateKey) || [];
      existing.push(task);
      map.set(dateKey, existing);
    }
    return map;
  }, [tasks]);

  const days = getMonthDays(year, month);
  const monthLabel = currentDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['s1', 's2', 's3', 's4'].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <title>Schedule — KrewPact</title>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <p className="text-muted-foreground">Tasks and upcoming deadlines</p>
          </div>
        </div>
        <ScheduleStats
          total={stats.total}
          inProgress={stats.inProgress}
          completed={stats.completed}
          overdue={stats.overdue}
        />
        <CalendarCard
          monthLabel={monthLabel}
          days={days}
          tasksByDate={tasksByDate}
          todayStr={todayStr}
          onPrev={() => setCurrentDate(new Date(year, month - 1, 1))}
          onNext={() => setCurrentDate(new Date(year, month + 1, 1))}
          onToday={() => setCurrentDate(new Date())}
        />
        <UpcomingTasks tasks={upcomingTasks} todayStr={todayStr} />
      </div>
    </>
  );
}
