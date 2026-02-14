'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2 } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useDivision } from '@/contexts/DivisionContext';
import { toast } from 'sonner';

interface ProjectCreationFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProjectMember {
  user_id: string;
  role: string;
  hours_allocated: number | null;
}

export function ProjectCreationForm({ onClose, onSuccess }: ProjectCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { activeDivision } = useDivision();
  const { data: users } = useUsers();
  const createProject = useCreateProject();

  // Form state — canonical column names
  const [formData, setFormData] = useState({
    project_name: '',
    project_number: '',
    description: '',
    site_street: '',
    site_city: '',
    site_province: '',
    site_postal_code: '',
    start_date: '',
    target_completion_date: '',
    baseline_budget: '',
    status: 'planning',
  });
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const steps = [
    { id: 1, title: 'Basic Information' },
    { id: 2, title: 'Project Details' },
    { id: 3, title: 'Team Assignment' },
    { id: 4, title: 'Review & Create' },
  ];

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addProjectMember = () => {
    setProjectMembers([...projectMembers, { user_id: '', role: 'worker', hours_allocated: null }]);
  };

  const removeProjectMember = (index: number) => {
    setProjectMembers(projectMembers.filter((_, i) => i !== index));
  };

  const updateProjectMember = (index: number, field: keyof ProjectMember, value: string | number | null) => {
    const updated = [...projectMembers];
    updated[index] = { ...updated[index], [field]: value };
    setProjectMembers(updated);
  };

  const formatSiteAddress = () => {
    const parts = [formData.site_street, formData.site_city, formData.site_province, formData.site_postal_code].filter(Boolean);
    return parts.join(', ');
  };

  const onSubmit = async () => {
    if (!formData.project_name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const siteAddress: Record<string, string> = {};
      if (formData.site_street) siteAddress.street = formData.site_street;
      if (formData.site_city) siteAddress.city = formData.site_city;
      if (formData.site_province) siteAddress.province = formData.site_province;
      if (formData.site_postal_code) siteAddress.postal_code = formData.site_postal_code;

      const projectData: Record<string, unknown> = {
        project_name: formData.project_name,
        project_number: formData.project_number || undefined,
        status: formData.status || 'planning',
        start_date: formData.start_date || undefined,
        target_completion_date: formData.target_completion_date || undefined,
        baseline_budget: formData.baseline_budget ? parseFloat(formData.baseline_budget) : undefined,
        current_budget: formData.baseline_budget ? parseFloat(formData.baseline_budget) : undefined,
        division_id: activeDivision?.id || undefined,
        site_address: Object.keys(siteAddress).length > 0 ? siteAddress : undefined,
      };

      await createProject.mutateAsync(projectData);

      toast.success(`"${formData.project_name}" has been created`);
      onSuccess?.();
    } catch {
      toast.error('Error creating project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>Project Name *</Label>
              <Input
                value={formData.project_name}
                onChange={(e) => updateField('project_name', e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label>Project Number</Label>
              <Input
                value={formData.project_number}
                onChange={(e) => updateField('project_number', e.target.value)}
                placeholder="e.g., PRJ-2026-001"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the project scope and objectives..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Street Address</Label>
                <Input
                  value={formData.site_street}
                  onChange={(e) => updateField('site_street', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={formData.site_city}
                  onChange={(e) => updateField('site_city', e.target.value)}
                  placeholder="Mississauga"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Province</Label>
                <Input
                  value={formData.site_province}
                  onChange={(e) => updateField('site_province', e.target.value)}
                  placeholder="ON"
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={formData.site_postal_code}
                  onChange={(e) => updateField('site_postal_code', e.target.value)}
                  placeholder="L5B 1M2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Target Completion Date</Label>
                <Input
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) => updateField('target_completion_date', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Baseline Budget</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.baseline_budget}
                onChange={(e) => updateField('baseline_budget', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Team Members</h4>
                  <p className="text-sm text-muted-foreground">Add team members to this project</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addProjectMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              <div className="space-y-3">
                {projectMembers.map((member, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Team Member</Label>
                          <Select
                            value={member.user_id}
                            onValueChange={(value) => updateProjectMember(index, 'user_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                ?.filter((user) => user.status === 'active')
                                .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Role</Label>
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateProjectMember(index, 'role', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="worker">Worker</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Hours Allocated</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={member.hours_allocated || ''}
                            onChange={(e) =>
                              updateProjectMember(
                                index,
                                'hours_allocated',
                                e.target.value ? parseFloat(e.target.value) : null,
                              )
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProjectMember(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
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
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{formData.project_name}</span>
                </div>
                {formData.project_number && (
                  <div className="flex justify-between">
                    <span className="font-medium">Number:</span>
                    <span>{formData.project_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {formatSiteAddress() && (
                  <div className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span>{formatSiteAddress()}</span>
                  </div>
                )}
                {formData.start_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">Start Date:</span>
                    <span>{new Date(formData.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.target_completion_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">Target Completion:</span>
                    <span>{new Date(formData.target_completion_date).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.baseline_budget && (
                  <div className="flex justify-between">
                    <span className="font-medium">Budget:</span>
                    <span>${parseFloat(formData.baseline_budget).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {projectMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Team Members ({projectMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {projectMembers.map((member, index) => {
                    const user = users?.find((u) => u.id === member.user_id);
                    return (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>
                          {user?.first_name} {user?.last_name}
                        </span>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= step.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
      </p>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep((s) => Math.min(steps.length, s + 1))}>
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
