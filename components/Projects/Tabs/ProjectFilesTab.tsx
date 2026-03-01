'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, Upload, FolderOpen } from 'lucide-react';

interface ProjectFilesTabProps {
  projectId: string;
}

export function ProjectFilesTab({ projectId: _projectId }: ProjectFilesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Files</h2>
        <Button disabled>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">File management coming soon</h3>
          <p className="text-muted-foreground">
            File upload and management will be available in the next phase
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
