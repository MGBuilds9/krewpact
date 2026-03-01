'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, FileText } from 'lucide-react';
import { useEstimateTemplates } from '@/hooks/useEstimating';
import { useDivision } from '@/contexts/DivisionContext';
import { EstimateTemplateForm } from '@/components/Estimates/EstimateTemplateForm';
import type { EstimateTemplate } from '@/hooks/useEstimating';

export default function EstimateTemplatesPage() {
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplate | undefined>();

  const { data, isLoading } = useEstimateTemplates({
    divisionId: activeDivision?.id,
  });

  const templates = data?.data ?? [];
  const filtered = templates.filter((t) => {
    if (!search) return true;
    return t.template_name.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingTemplate(undefined); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create estimate templates to standardize your proposals
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setEditingTemplate(template); setDialogOpen(true); }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{template.template_name}</h3>
                      {template.is_default && (
                        <Badge variant="outline" className="text-xs flex-shrink-0 border bg-blue-100 text-blue-700 border-blue-200">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {template.project_type && <span>Type: {template.project_type}</span>}
                      <span>
                        {new Date(template.created_at).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <EstimateTemplateForm
            template={editingTemplate}
            divisionId={activeDivision?.id}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
