'use client';

import { AlertCircle, Clock, ListTodo } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface ScheduleStatsProps {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export function ScheduleStats({ total, inProgress, completed, overdue }: ScheduleStatsProps) {
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
