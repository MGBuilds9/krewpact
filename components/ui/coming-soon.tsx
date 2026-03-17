import { Construction } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <Construction className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{feature}</h2>
            <p className="text-sm text-muted-foreground">
              {description ?? 'This feature is being prepared and will be available soon.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
