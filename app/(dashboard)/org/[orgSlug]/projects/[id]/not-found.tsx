import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Project Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            This project may have been deleted or you don&apos;t have access.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="../projects">Back to Projects</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
