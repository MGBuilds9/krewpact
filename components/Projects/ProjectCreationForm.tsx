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
import { Switch } from '@/components/ui/switch';
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    client_name: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'planning',
    manager_id: '',
  });
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const steps = [
    { id: 1, title: 'Basic Information' },
    { id: 2, title: 'Project Details' },
    { id: 3, title: 'Client Information' },
    { id: 4, title: 'Team Assignment' },
    { id: 5, title: 'Review & Create' },
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

  const onSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectData: Record<string, unknown> = {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        address: formData.address || undefined,
        client_name: formData.client_name || undefined,
        status: formData.status || 'planning',
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        division_id: activeDivision?.id || undefined,
        manager_id: formData.manager_id || undefined,
      };

      if (showClientInfo) {
        projectData.client_email = clientEmail || undefined;
        projectData.client_phone = clientPhone || undefined;
      }

      await createProject.mutateAsync(projectData);

      toast.success(`"${formData.name}" has been created`);
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
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label>Project Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="e.g., PROJ-2024-001"
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
                <Label>Project Location</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="e.g., 123 Main St, City"
                />
              </div>
              <div>
                <Label>Client Name</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  placeholder="Client or company name"
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
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => updateField('end_date', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Project Budget</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.budget}
                onChange={(e) => updateField('budget', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-client-info"
                checked={showClientInfo}
                onCheckedChange={setShowClientInfo}
              />
              <Label htmlFor="show-client-info">Include client contact information</Label>
            </div>
            {showClientInfo && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium">Client Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Client Email</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Client Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This information will only be visible to project managers and division managers.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Project Manager</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) => updateField('manager_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project manager" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    ?.filter((user) => user.is_internal)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

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
                                ?.filter((user) => user.is_internal)
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

      case 5:
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
                  <span>{formData.name}</span>
                </div>
                {formData.code && (
                  <div className="flex justify-between">
                    <span className="font-medium">Code:</span>
                    <span>{formData.code}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {formData.address && (
                  <div className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span>{formData.address}</span>
                  </div>
                )}
                {formData.client_name && (
                  <div className="flex justify-between">
                    <span className="font-medium">Client:</span>
                    <span>{formData.client_name}</span>
                  </div>
                )}
                {formData.start_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">Start Date:</span>
                    <span>{new Date(formData.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.end_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">End Date:</span>
                    <span>{new Date(formData.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.budget && (
                  <div className="flex justify-between">
                    <span className="font-medium">Budget:</span>
                    <span>${parseFloat(formData.budget).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {showClientInfo && (clientEmail || clientPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {clientEmail && (
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span>{clientEmail}</span>
                    </div>
                  )}
                  {clientPhone && (
                    <div className="flex justify-between">
                      <span className="font-medium">Phone:</span>
                      <span>{clientPhone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {formData.manager_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Manager</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {users?.find((u) => u.id === formData.manager_id)?.first_name}{' '}
                  {users?.find((u) => u.id === formData.manager_id)?.last_name}
                </CardContent>
              </Card>
            )}

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
