import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CreateSearchProjectInput, ProjectCriteria } from '../../../server/src/schema';

interface ProjectFormProps {
  userId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectForm({ userId, onSuccess, onCancel }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateSearchProjectInput, 'created_by_user_id'>>({
    name: '',
    description: null,
    status: 'DRAFT',
    criteria: {
      minimum_years_experience: null,
      target_role: null,
      required_skills: [],
      preferred_skills: [],
      target_industries: [],
      max_job_changes_per_year: null,
      weights: {
        years_experience: 25,
        role_match: 25,
        skills_match: 30,
        industry_match: 10,
        job_stability: 10
      }
    }
  });

  const [newRequiredSkill, setNewRequiredSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that weights sum to 100
    const totalWeight = Object.values(formData.criteria.weights).reduce((sum: number, weight: number) => sum + weight, 0);
    if (totalWeight !== 100) {
      alert('Criteria weights must sum to 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectData: CreateSearchProjectInput = {
        ...formData,
        created_by_user_id: userId
      };
      await trpc.createSearchProject.mutate(projectData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRequiredSkill = () => {
    if (newRequiredSkill.trim() && !formData.criteria.required_skills.includes(newRequiredSkill.trim())) {
      setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          required_skills: [...prev.criteria.required_skills, newRequiredSkill.trim()]
        }
      }));
      setNewRequiredSkill('');
    }
  };

  const removeRequiredSkill = (skill: string) => {
    setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        required_skills: prev.criteria.required_skills.filter((s: string) => s !== skill)
      }
    }));
  };

  const addPreferredSkill = () => {
    if (newPreferredSkill.trim() && !formData.criteria.preferred_skills.includes(newPreferredSkill.trim())) {
      setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          preferred_skills: [...prev.criteria.preferred_skills, newPreferredSkill.trim()]
        }
      }));
      setNewPreferredSkill('');
    }
  };

  const removePreferredSkill = (skill: string) => {
    setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        preferred_skills: prev.criteria.preferred_skills.filter((s: string) => s !== skill)
      }
    }));
  };

  const addIndustry = () => {
    if (newIndustry.trim() && !formData.criteria.target_industries.includes(newIndustry.trim())) {
      setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          target_industries: [...prev.criteria.target_industries, newIndustry.trim()]
        }
      }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (industry: string) => {
    setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        target_industries: prev.criteria.target_industries.filter((i: string) => i !== industry)
      }
    }));
  };

  const updateWeight = (field: keyof ProjectCriteria['weights'], value: number) => {
    setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        weights: {
          ...prev.criteria.weights,
          [field]: value
        }
      }
    }));
  };

  const totalWeight = Object.values(formData.criteria.weights).reduce((sum: number, weight: number) => sum + weight, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
                ...prev,
                name: e.target.value
              }))
            }
            placeholder="e.g., Senior Frontend Developer Search"
            required
          />
        </div>

        <div>
          <Label htmlFor="project-description">Description (Optional)</Label>
          <Textarea
            id="project-description"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
                ...prev,
                description: e.target.value || null
              }))
            }
            placeholder="Describe the role and requirements..."
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Search Criteria */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Search Criteria</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min-experience">Minimum Years of Experience</Label>
            <Input
              id="min-experience"
              type="number"
              min="0"
              max="50"
              value={formData.criteria.minimum_years_experience || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
                  ...prev,
                  criteria: {
                    ...prev.criteria,
                    minimum_years_experience: e.target.value ? parseInt(e.target.value) : null
                  }
                }))
              }
              placeholder="e.g., 5"
            />
          </div>

          <div>
            <Label htmlFor="target-role">Target Role</Label>
            <Input
              id="target-role"
              value={formData.criteria.target_role || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
                  ...prev,
                  criteria: {
                    ...prev.criteria,
                    target_role: e.target.value || null
                  }
                }))
              }
              placeholder="e.g., Senior Software Engineer"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="max-job-changes">Maximum Job Changes per Year</Label>
          <Input
            id="max-job-changes"
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={formData.criteria.max_job_changes_per_year || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: Omit<CreateSearchProjectInput, 'created_by_user_id'>) => ({
                ...prev,
                criteria: {
                  ...prev.criteria,
                  max_job_changes_per_year: e.target.value ? parseFloat(e.target.value) : null
                }
              }))
            }
            placeholder="e.g., 1.0"
          />
          <p className="text-sm text-gray-500 mt-1">
            Higher values indicate less job stability preference
          </p>
        </div>

        {/* Required Skills */}
        <div>
          <Label>Required Skills</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newRequiredSkill}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRequiredSkill(e.target.value)}
              placeholder="Enter a required skill"
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRequiredSkill();
                }
              }}
            />
            <Button type="button" onClick={addRequiredSkill} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.criteria.required_skills.map((skill: string, index: number) => (
              <Badge key={`req-${index}-${skill}`} variant="default" className="flex items-center gap-1">
                {skill}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => removeRequiredSkill(skill)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Preferred Skills */}
        <div>
          <Label>Preferred Skills</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newPreferredSkill}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPreferredSkill(e.target.value)}
              placeholder="Enter a preferred skill"
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPreferredSkill();
                }
              }}
            />
            <Button type="button" onClick={addPreferredSkill} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.criteria.preferred_skills.map((skill: string, index: number) => (
              <Badge key={`pref-${index}-${skill}`} variant="secondary" className="flex items-center gap-1">
                {skill}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => removePreferredSkill(skill)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Target Industries */}
        <div>
          <Label>Target Industries</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newIndustry}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIndustry(e.target.value)}
              placeholder="Enter target industry"
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIndustry();
                }
              }}
            />
            <Button type="button" onClick={addIndustry} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.criteria.target_industries.map((industry: string, index: number) => (
              <Badge key={`ind-${index}-${industry}`} variant="outline" className="flex items-center gap-1">
                {industry}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => removeIndustry(industry)}
                />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Criteria Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Criteria Weights</span>
            <Badge variant={totalWeight === 100 ? 'default' : 'destructive'}>
              Total: {totalWeight}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Years of Experience ({formData.criteria.weights.years_experience}%)</Label>
            <Slider
              value={[formData.criteria.weights.years_experience]}
              onValueChange={([value]: number[]) => updateWeight('years_experience', value)}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Role Match ({formData.criteria.weights.role_match}%)</Label>
            <Slider
              value={[formData.criteria.weights.role_match]}
              onValueChange={([value]: number[]) => updateWeight('role_match', value)}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Skills Match ({formData.criteria.weights.skills_match}%)</Label>
            <Slider
              value={[formData.criteria.weights.skills_match]}
              onValueChange={([value]: number[]) => updateWeight('skills_match', value)}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Industry Match ({formData.criteria.weights.industry_match}%)</Label>
            <Slider
              value={[formData.criteria.weights.industry_match]}
              onValueChange={([value]: number[]) => updateWeight('industry_match', value)}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Job Stability ({formData.criteria.weights.job_stability}%)</Label>
            <Slider
              value={[formData.criteria.weights.job_stability]}
              onValueChange={([value]: number[]) => updateWeight('job_stability', value)}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          {totalWeight !== 100 && (
            <p className="text-sm text-red-600">
              ⚠️ Weights must sum to exactly 100%. Current total: {totalWeight}%
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || totalWeight !== 100}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}