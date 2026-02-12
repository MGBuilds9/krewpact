'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, FolderOpen, Search } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">File management and uploads</p>
          </div>
        </div>
        <Button disabled>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Document Management</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Full document management with folder navigation, file upload, search, and preview will be available in the next phase. This includes Supabase storage integration and file sharing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
