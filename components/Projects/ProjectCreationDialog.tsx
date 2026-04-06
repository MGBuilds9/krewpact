'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { ProjectCreationForm } from './ProjectCreationForm';

interface ProjectCreationDialogProps {
  onProjectCreated?: () => void;
}

export function ProjectCreationDialog({ onProjectCreated }: ProjectCreationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription className="sr-only">Create a new project</DialogDescription>
        </DialogHeader>
        <ProjectCreationForm
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            onProjectCreated?.();
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
