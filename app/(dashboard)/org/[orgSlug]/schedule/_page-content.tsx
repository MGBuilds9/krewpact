'use client';

import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListTodo,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type Task, useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};
const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
};

interface CalendarCell {
  key: string;
  day: number | null;
}

function getMonthDays(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ key: `pre-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ key: dateStr, day: d });
  }
  const trailing = cells.length;
  while (cells.length % 7 !== 0) cells.push({ key: `post-${cells.length - trailing}`, day: null });
  return cells;
}

interface ScheduleStatsProps {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
}
function ScheduleStats({ total, inProgress, completed, overdue }: ScheduleStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ListTodo className="h-4 w-4" /> Total Tasks
          </div>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4" /> In Progress
          </div>
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertCircle className="h-4 w-4" /> Overdue
          </div>
          <div className="text-2xl font-bold text-red-600">{overdue}</div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CalendarDayProps {
  dayKey: string;
  day: number;
  dayTasks: Task[];
  isToday: boolean;
  isPast: boolean;
}
function CalendarDay({ dayKey, day, dayTasks, isToday, isPast }: CalendarDayProps) {
  return (
    <div
      key={dayKey}
      className={cn('border-r border-b min-h-[80px] p-1', isToday && 'bg-primary/5')}
    >
      <div
        className={cn(
          'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
          isToday && 'bg-primary text-primary-foreground',
        )}
      >
        {day}
      </div>
      <div className="space-y-0.5">
        {dayTasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className={cn(
              'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
              task.status === 'done'
                ? 'bg-green-100 text-green-700 line-through'
                : isPast
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700',
            )}
            title={task.title}
          >
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full mr-0.5',
                PRIORITY_COLORS[task.priority] || 'bg-gray-400',
              )}
            />
            {task.title}
          </div>
        ))}
        {dayTasks.length > 3 && (
          <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

interface CalendarCardProps {
  monthLabel: string;
  days: CalendarCell[];
  tasksByDate: Map<string, Task[]>;
  todayStr: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}
function CalendarCard({
  monthLabel,
  days,
  tasksByDate,
  todayStr,
  onPrev,
  onNext,
  onToday,
}: CalendarCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {monthLabel}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onPrev}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onNext}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-t border-l">
          {days.map(({ key, day }) => {
            if (day === null)
              return <div key={key} className="border-r border-b min-h-[80px] bg-muted/30" />;
            const dayTasks = tasksByDate.get(key) || [];
            return (
              <CalendarDay
                key={key}
                dayKey={key}
                day={day}
                dayTasks={dayTasks}
                isToday={key === todayStr}
                isPast={key < todayStr}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface UpcomingTasksProps {
  tasks: Task[];
  todayStr: string;
}
function UpcomingTasks({ tasks, todayStr }: UpcomingTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue =
                task.due_at !== null && task.due_at !== undefined ? task.due_at < todayStr : false;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={PRIORITY_VARIANTS[task.priority] || 'outline'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}
                  >
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : ''}
                    {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
