'use client';

import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { type AiPreferences } from '@/hooks/useSystem';

interface AiTabProps {
  aiPrefs: AiPreferences;
  setAiPrefs: (p: AiPreferences) => void;
  aiSaved: boolean;
  onSave: () => void;
}

export function AiTab({ aiPrefs, setAiPrefs, aiSaved, onSave }: AiTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Preferences</CardTitle>
        <CardDescription>Configure how AI features behave for your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Insight Confidence Threshold</Label>
          <p className="text-sm text-muted-foreground">
            Only show AI insights with confidence above this value (0-100%).
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round(aiPrefs.insight_min_confidence * 100)}
              onChange={(e) =>
                setAiPrefs({ ...aiPrefs, insight_min_confidence: Number(e.target.value) / 100 })
              }
              className="w-24"
              aria-label="Confidence threshold percentage"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Daily Digest Email</Label>
            <p className="text-sm text-muted-foreground">
              Receive a morning briefing email with key metrics and tasks.
            </p>
          </div>
          <Switch
            checked={aiPrefs.digest_enabled}
            onCheckedChange={(checked) => setAiPrefs({ ...aiPrefs, digest_enabled: checked })}
            aria-label="Toggle daily digest"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>AI Suggestions</Label>
            <p className="text-sm text-muted-foreground">
              Show AI-powered suggestions on form fields.
            </p>
          </div>
          <Switch
            checked={aiPrefs.ai_suggestions_enabled}
            onCheckedChange={(checked) =>
              setAiPrefs({ ...aiPrefs, ai_suggestions_enabled: checked })
            }
            aria-label="Toggle AI suggestions"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            {aiSaved ? 'Saved!' : 'Save AI Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiTabLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Preferences</CardTitle>
        <CardDescription>Configure how AI features behave for your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}
