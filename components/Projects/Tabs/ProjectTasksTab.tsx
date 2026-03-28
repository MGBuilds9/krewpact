'use client';
import { Calendar, Plus, User as UserIcon } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type Task, useCreateTask, useTasks, useUpdateTask } from '@/hooks/useTasks';
import { type User, useUsers } from '@/hooks/useUsers';

interface ProjectTasksTabProps {
  projectId: string;
}

type ColumnDef = { id: string; title: string; status: string };

const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', status: 'todo' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
  { id: 'done', title: 'Done', status: 'done' },
];

const TaskCard = memo(function TaskCard({
  task,
  column,
  assignedUser,
  onStatusChange,
}: {
  task: Task;
  column: ColumnDef;
  assignedUser: User | undefined;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <h4 className="font-medium mb-2">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {task.due_at && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_at).toLocaleDateString()}
          </div>
        )}
        {task.assigned_user_id && (
          <div className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {assignedUser?.first_name || 'Assigned'}
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {column.status !== 'todo' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onStatusChange(task.id, column.status === 'in_progress' ? 'todo' : 'in_progress')
            }
          >
            Back
          </Button>
        )}
        {column.status !== 'done' && (
          <Button
            size="sm"
            onClick={() =>
              onStatusChange(task.id, column.status === 'todo' ? 'in_progress' : 'done')
            }
          >
            {column.status === 'todo' ? 'Start' : 'Complete'}
          </Button>
        )}
      </div>
    </Card>
  );
});

function TaskColumn({
  column,
  tasks,
  users,
  onStatusChange,
}: {
  column: ColumnDef;
  tasks: Task[];
  users: Map<string, User>;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{column.title}</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            column={column}
            assignedUser={task.assigned_user_id ? users.get(task.assigned_user_id) : undefined}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No tasks in this column</p>
        )}
      </CardContent>
    </Card>
  );
}

function TaskBoard({
  tasks,
  users,
  onStatusChange,
}: {
  tasks: Task[];
  users: User[] | undefined;
  onStatusChange: (id: string, status: string) => void;
}) {
  const usersById = useMemo(
    () => new Map((users ?? []).map((user) => [user.id, user] as const)),
    [users],
  );
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of tasks) {
      grouped[task.status]?.push(task);
    }
    return grouped;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {COLUMNS.map((column) => (
        <TaskColumn
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.status]}
          users={usersById}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
function CreateTaskDialog({ projectId, users }: { projectId: string; users: User[] | undefined }) {
  const createTask = useCreateTask();
  const [isOpen, setIsOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_user_id: '',
  });

  const handleCreateTask = useCallback(async () => {
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
  }, [createTask, newTask, projectId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
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
          <Button
            onClick={handleCreateTask}
            className="w-full"
            disabled={!newTask.title || createTask.isPending}
          >
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks = [] } = useTasks(projectId);
  const { data: users } = useUsers();
  const updateTask = useUpdateTask();

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      try {
        await updateTask.mutateAsync({ id: taskId, updates: { status: newStatus } });
      } catch {
        toast.error('Error updating task');
      }
    },
    [updateTask],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Task Board</h2>
        <CreateTaskDialog projectId={projectId} users={users} />
      </div>
      <TaskBoard tasks={tasks} users={users} onStatusChange={handleStatusChange} />
    </div>
  );
}
