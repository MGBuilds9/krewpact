'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

export interface CalendarCell {
  key: string;
  day: number | null;
}

export function getMonthDays(year: number, month: number): CalendarCell[] {
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

export function CalendarCard({
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

// Re-export Badge for UpcomingTasks to avoid cross-file import confusion
export { Badge };
