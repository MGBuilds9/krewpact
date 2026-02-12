'use client';

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  steps?: string[];
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  steps,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 animate-fade-in">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {primaryAction && (
              <Button onClick={primaryAction.onClick} size="lg">
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {steps && steps.length > 0 && (
          <div className="w-full max-w-md">
            <p className="text-sm font-medium text-muted-foreground mb-3">Get started:</p>
            <div className="space-y-2 text-left">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
