'use client';

import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Task } from '@/hooks/useTasks';

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
};

interface UpcomingTasksProps {
  tasks: Task[];
  todayStr: string;
}

export function UpcomingTasks({ tasks, todayStr }: UpcomingTasksProps) {
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
