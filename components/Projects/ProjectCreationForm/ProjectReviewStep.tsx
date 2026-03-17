'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/hooks/useUsers';

import type { ProjectFormData, ProjectMember } from './types';

interface ProjectReviewStepProps {
  formData: ProjectFormData;
  projectMembers: ProjectMember[];
  formatSiteAddress: () => string;
}

type ReviewUsers = NonNullable<ReturnType<typeof useUsers>['data']>;

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex justify-between">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export function ProjectReviewStep({
  formData,
  projectMembers,
  formatSiteAddress,
}: ProjectReviewStepProps) {
  const { data: users } = useUsers();
  const siteAddress = formatSiteAddress();

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Review Project Information</h3>
        <p className="text-muted-foreground text-sm">
          Please review all information before creating the project
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DetailRow label="Name" value={formData.project_name} />
          {formData.project_number && <DetailRow label="Number" value={formData.project_number} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {siteAddress && <DetailRow label="Location" value={siteAddress} />}
          {formData.start_date && (
            <DetailRow
              label="Start Date"
              value={new Date(formData.start_date).toLocaleDateString()}
            />
          )}
          {formData.target_completion_date && (
            <DetailRow
              label="Target Completion"
              value={new Date(formData.target_completion_date).toLocaleDateString()}
            />
          )}
          {formData.baseline_budget && (
            <DetailRow
              label="Budget"
              value={`$${parseFloat(formData.baseline_budget).toLocaleString()}`}
            />
          )}
        </CardContent>
      </Card>
      {projectMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Members ({projectMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectMembers.map((member) => {
              const user = (users as ReviewUsers | undefined)?.find((u) => u.id === member.user_id);
              return (
                <div key={member.user_id} className="flex justify-between items-center text-sm">
                  <span>
                    {user?.first_name} {user?.last_name}
                  </span>
                  <Badge variant="outline">{member.member_role}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
