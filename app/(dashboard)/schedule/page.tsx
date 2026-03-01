'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, ListTodo, AlertCircle } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';

export default function SchedulePage() {
  const { data: tasks, isLoading } = useTasks();

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    const today = new Date().toISOString().split('T')[0];
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      overdue: tasks.filter(
        (t) => t.due_at && t.due_at < today && t.status !== 'done',
      ).length,
    };
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.due_at && t.status !== 'done')
      .sort((a, b) => (a.due_at! > b.due_at! ? 1 : -1))
      .slice(0, 10);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">Tasks and upcoming deadlines</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ListTodo className="h-4 w-4" /> Total Tasks
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> In Progress
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="h-4 w-4" /> Overdue
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => {
                const isOverdue = task.due_at! < new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className={`text-sm font-medium flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {new Date(task.due_at!).toLocaleDateString()}
                      {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Full calendar view with Microsoft 365 integration coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
