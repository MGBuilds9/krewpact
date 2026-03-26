'use client';

import { AlertCircle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';

interface ProjectBudgetTabProps {
  project: Project;
}

const BudgetCard = ({ title, icon, value, sub, overBudget }: { title: string; icon: React.ReactNode; value: string; sub: string; overBudget?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${overBudget ? 'text-destructive' : ''}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </CardContent>
  </Card>
);

export function ProjectBudgetTab({ project }: ProjectBudgetTabProps) {
  const budget = project.baseline_budget || 0;
  const spent = project.current_budget || 0;
  const remaining = budget - spent;
  const percentageSpent = budget > 0 ? (spent / budget) * 100 : 0;
  const isOverBudget = spent > budget;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Budget Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BudgetCard title="Total Budget" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} value={`$${budget.toLocaleString()}`} sub="Allocated funds" />
        <BudgetCard title="Total Spent" icon={isOverBudget ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-green-500" />} value={`$${spent.toLocaleString()}`} sub={`${percentageSpent.toFixed(1)}% of budget`} overBudget={isOverBudget} />
        <BudgetCard title="Remaining" icon={isOverBudget ? <AlertCircle className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />} value={`$${Math.abs(remaining).toLocaleString()}`} sub={isOverBudget ? 'Over budget' : 'Available'} overBudget={isOverBudget} />
      </div>
      <Card>
        <CardHeader><CardTitle>Budget Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Spent: ${spent.toLocaleString()}</span>
              <span>{percentageSpent.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(percentageSpent, 100)} className={`h-4 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`} />
            {isOverBudget && <p className="text-sm text-destructive mt-2">Project is over budget by ${Math.abs(remaining).toLocaleString()}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
