'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Calendar, User } from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';

interface ProjectTasksTabProps {
  projectId: string;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks = [] } = useTasks(projectId);
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [isOpen, setIsOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_user_id: '',
  });

  const handleCreateTask = async () => {
    try {
      await createTask.mutateAsync({
        title: newTask.title,
        description: newTask.description,
        project_id: projectId,
        assigned_user_id: newTask.assigned_user_id || undefined,
        status: 'todo',
        priority: 'medium',
      });
      setNewTask({ title: '', description: '', assigned_user_id: '' });
      setIsOpen(false);
      toast.success('Task created successfully');
    } catch {
      toast.error('Error creating task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, updates: { status: newStatus } });
    } catch {
      toast.error('Error updating task');
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
    { id: 'done', title: 'Done', status: 'done' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Task Board</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select
                  value={newTask.assigned_user_id}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTask} className="w-full" disabled={!newTask.title}>
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <Card key={column.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{column.title}</span>
                <Badge variant="secondary">
                  {tasks.filter((t) => t.status === column.status).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks
                .filter((task) => task.status === column.status)
                .map((task) => (
                  <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium mb-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.due_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.due_at)}
                        </div>
                      )}
                      {task.assigned_user_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {users?.find((u) => u.id === task.assigned_user_id)?.first_name ||
                            'Assigned'}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {column.status !== 'todo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(
                              task.id,
                              column.status === 'in_progress' ? 'todo' : 'in_progress',
                            )
                          }
                        >
                          Back
                        </Button>
                      )}
                      {column.status !== 'done' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusChange(
                              task.id,
                              column.status === 'todo' ? 'in_progress' : 'done',
                            )
                          }
                        >
                          {column.status === 'todo' ? 'Start' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              {tasks.filter((t) => t.status === column.status).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No tasks in this column
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
