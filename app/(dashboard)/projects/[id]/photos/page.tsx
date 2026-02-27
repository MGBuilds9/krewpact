'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Camera, Plus, MessageSquare } from 'lucide-react';
import { usePhotos } from '@/hooks/useDocuments';
import { PhotoCaptureForm } from '@/components/Documents/PhotoCaptureForm';
import { PhotoAnnotationForm } from '@/components/Documents/PhotoAnnotationForm';

const CATEGORIES = ['all', 'progress', 'deficiency', 'safety', 'site_condition', 'completion', 'other'] as const;

export default function PhotosPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [category, setCategory] = useState<string>('all');
  const [annotatePhotoId, setAnnotatePhotoId] = useState<string | null>(null);
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);

  const { data: photosData, isLoading } = usePhotos(projectId);
  const photos = (photosData?.data ?? []).filter(
    (p) => category === 'all' || p.category === category,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Site Photos</h1>
            <p className="text-sm text-muted-foreground">
              {photosData?.total ?? 0} photos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={addPhotoOpen} onOpenChange={setAddPhotoOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Site Photo</DialogTitle>
              </DialogHeader>
              <PhotoCaptureForm
                projectId={projectId}
                onSuccess={() => setAddPhotoOpen(false)}
                onCancel={() => setAddPhotoOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="h-16 w-16 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">No photos yet</p>
          <p className="text-sm">Document site progress with photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-xl border bg-muted/30 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {photo.category ?? 'other'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setAnnotatePhotoId(photo.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {photo.taken_at
                  ? new Date(photo.taken_at).toLocaleDateString('en-CA')
                  : 'No date'}
              </p>
              <p className="text-xs font-mono text-muted-foreground truncate">{photo.file_id}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!annotatePhotoId} onOpenChange={(o) => !o && setAnnotatePhotoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
          </DialogHeader>
          {annotatePhotoId && (
            <PhotoAnnotationForm
              projectId={projectId}
              photoId={annotatePhotoId}
              onSuccess={() => setAnnotatePhotoId(null)}
              onCancel={() => setAnnotatePhotoId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
