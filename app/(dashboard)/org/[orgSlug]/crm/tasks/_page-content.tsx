'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompleteTask, useMyTasks } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { CreateTaskDialog } from './_components/CreateTaskDialog';
import type { Filter } from './_components/TaskFilterBar';
import { TaskFilterBar } from './_components/TaskFilterBar';
import { TaskListContent } from './_components/TaskListContent';

export default function CRMTasksPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [entityType, setEntityType] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const completeTask = useCompleteTask();
  const queryClient = useQueryClient();
  const { push: orgPush } = useOrgRouter();

  const handleDisposition = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['overdue-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  }, [queryClient]);

  const { data, isLoading } = useMyTasks({
    filter,
    entityType:
      entityType === 'all'
        ? undefined
        : (entityType as 'lead' | 'opportunity' | 'account' | 'contact'),
    limit: 50,
  });

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <title>My Tasks — KrewPact CRM</title>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {total} task{total !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter})` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
        <TaskFilterBar filter={filter} onFilterChange={setFilter} />
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="sr-only">Task list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TaskListContent
              tasks={tasks}
              isLoading={isLoading}
              filter={filter}
              onComplete={(id) => completeTask.mutate({ id })}
              onDisposition={handleDisposition}
              onNavigate={orgPush}
            />
          </CardContent>
        </Card>
      </div>
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
