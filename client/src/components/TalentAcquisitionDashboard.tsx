import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Target, 
  Users, 
  TrendingUp, 
  Settings,
  Eye,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Briefcase,
  Star,
  Play,
  Sliders
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { ProjectCandidates } from '@/components/ProjectCandidates';
import type { User, SearchProject, ProjectCriteria } from '../../../server/src/schema';

interface TalentAcquisitionDashboardProps {
  user: User;
}

export function TalentAcquisitionDashboard({ user }: TalentAcquisitionDashboardProps) {
  const [allProjects, setAllProjects] = useState<SearchProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SearchProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [weightProject, setWeightProject] = useState<SearchProject | null>(null);
  const [newWeights, setNewWeights] = useState<ProjectCriteria['weights']>({
    years_experience: 25,
    role_match: 25,
    skills_match: 30,
    industry_match: 10,
    job_stability: 10
  });

  const loadAllProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects = await trpc.getAllProjects.query();
      setAllProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      // Use mock data when backend is not available
      if (user.role === 'TALENT_ACQUISITION') {
        const mockAllProjects: SearchProject[] = [
          {
            id: 1,
            name: 'Senior Frontend Developer Search',
            description: 'Looking for an experienced React developer for our fintech startup',
            created_by_user_id: 2, // Job Provider user
            status: 'ACTIVE',
            criteria: {
              minimum_years_experience: 5,
              target_role: 'Senior Frontend Developer',
              required_skills: ['React', 'TypeScript', 'JavaScript'],
              preferred_skills: ['Next.js', 'GraphQL', 'AWS'],
              target_industries: ['Fintech', 'Technology'],
              max_job_changes_per_year: 1.0,
              weights: {
                years_experience: 30,
                role_match: 25,
                skills_match: 25,
                industry_match: 15,
                job_stability: 5
              }
            },
            created_at: new Date('2024-01-20'),
            updated_at: new Date('2024-01-22')
          },
          {
            id: 2,
            name: 'DevOps Engineer Position',
            description: 'Seeking DevOps engineer with cloud expertise',
            created_by_user_id: 2,
            status: 'DRAFT',
            criteria: {
              minimum_years_experience: 3,
              target_role: 'DevOps Engineer',
              required_skills: ['AWS', 'Docker', 'Kubernetes'],
              preferred_skills: ['Terraform', 'Jenkins', 'Python'],
              target_industries: ['Technology', 'Cloud Services'],
              max_job_changes_per_year: 1.5,
              weights: {
                years_experience: 25,
                role_match: 20,
                skills_match: 35,
                industry_match: 10,
                job_stability: 10
              }
            },
            created_at: new Date('2024-01-18'),
            updated_at: new Date('2024-01-18')
          },
          {
            id: 3,
            name: 'Full Stack Developer - E-commerce',
            description: 'Full stack developer for our e-commerce platform',
            created_by_user_id: 5, // Another Job Provider
            status: 'COMPLETED',
            criteria: {
              minimum_years_experience: 4,
              target_role: 'Full Stack Developer',
              required_skills: ['Node.js', 'React', 'MongoDB'],
              preferred_skills: ['Express.js', 'Redis', 'Docker'],
              target_industries: ['E-commerce', 'Retail', 'Technology'],
              max_job_changes_per_year: 1.2,
              weights: {
                years_experience: 25,
                role_match: 25,
                skills_match: 30,
                industry_match: 10,
                job_stability: 10
              }
            },
            created_at: new Date('2024-01-05'),
            updated_at: new Date('2024-01-15')
          }
        ];
        setAllProjects(mockAllProjects);
        console.info('Using mock project data for talent acquisition demonstration');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    loadAllProjects();
  }, [loadAllProjects]);

  const handleOpenWeightDialog = (project: SearchProject) => {
    setWeightProject(project);
    if (project.criteria && project.criteria.weights) {
      setNewWeights(project.criteria.weights);
    }
    setIsWeightDialogOpen(true);
  };

  const handleUpdateWeights = async () => {
    if (!weightProject) return;

    try {
      // Validate that weights sum to 100
      const totalWeight = Object.values(newWeights).reduce((sum: number, weight: number) => sum + weight, 0);
      if (totalWeight !== 100) {
        alert('Criteria weights must sum to 100%');
        return;
      }

      await trpc.rerunMatchingWithNewWeights.mutate({
        projectId: weightProject.id,
        newWeights
      });

      setIsWeightDialogOpen(false);
      loadAllProjects();
      
      if (selectedProject?.id === weightProject.id) {
        const updatedProject = await trpc.getProjectDetails.query({ projectId: weightProject.id });
        setSelectedProject(updatedProject);
      }
    } catch (error) {
      console.error('Failed to update weights and re-run matching:', error);
      alert('Failed to update weights. Please try again.');
    }
  };

  const updateWeight = (field: keyof ProjectCriteria['weights'], value: number) => {
    setNewWeights((prev: ProjectCriteria['weights']) => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-3 w-3" />;
      case 'DRAFT':
        return <Clock className="h-3 w-3" />;
      case 'COMPLETED':
        return <Target className="h-3 w-3" />;
      case 'ARCHIVED':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const activeProjects = allProjects.filter((p: SearchProject) => p.status === 'ACTIVE');
  const draftProjects = allProjects.filter((p: SearchProject) => p.status === 'DRAFT');
  const completedProjects = allProjects.filter((p: SearchProject) => p.status === 'COMPLETED');

  const totalWeight = Object.values(newWeights).reduce((sum: number, weight: number) => sum + weight, 0);

  const renderProjectCard = (project: SearchProject) => (
    <Card 
      key={project.id} 
      className="hover:shadow-md transition-all duration-200"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">
              {project.description || 'No description provided'}
            </p>
          </div>
          <Badge className={`${getStatusColor(project.status)} flex items-center space-x-1`}>
            {getStatusIcon(project.status)}
            <span>{project.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Created:</span>
            <span>{project.created_at.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Last Updated:</span>
            <span>{project.updated_at.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Current Weights Display */}
        {project.criteria && project.criteria.weights && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Current Weights</span>
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Experience:</span>
                <span>{project.criteria.weights.years_experience}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Role Match:</span>
                <span>{project.criteria.weights.role_match}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Skills:</span>
                <span>{project.criteria.weights.skills_match}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Industry:</span>
                <span>{project.criteria.weights.industry_match}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Stability:</span>
                <span>{project.criteria.weights.job_stability}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Criteria Summary */}
        {project.criteria && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Criteria Summary:</div>
            <div className="flex flex-wrap gap-1">
              {project.criteria.minimum_years_experience && (
                <Badge variant="outline" className="text-xs">
                  {project.criteria.minimum_years_experience}+ years
                </Badge>
              )}
              {project.criteria.target_role && (
                <Badge variant="outline" className="text-xs">
                  {project.criteria.target_role}
                </Badge>
              )}
              {project.criteria.required_skills?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {project.criteria.required_skills.length} required skills
                </Badge>
              )}
              {project.criteria.preferred_skills?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {project.criteria.preferred_skills.length} preferred skills
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenWeightDialog(project)}
              className="flex items-center space-x-1"
            >
              <Sliders className="h-3 w-3" />
              <span>Adjust Weights</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProject(project)}
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Eye className="h-3 w-3" />
              <span>View Details</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (selectedProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
            >
              ← Back to Overview
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
              <p className="text-gray-600">{selectedProject.description}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(selectedProject.status)} flex items-center space-x-1`}>
            {getStatusIcon(selectedProject.status)}
            <span>{selectedProject.status}</span>
          </Badge>
        </div>
        
        <ProjectCandidates project={selectedProject} onProjectUpdate={loadAllProjects} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>All Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Active</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Draft</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedProjects.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Projects Pipeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          ) : allProjects.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No projects found</h3>
              <p className="text-gray-500">
                Job providers haven't created any search projects yet
              </p>
            </div>
          ) : (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="active" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Active ({activeProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="draft" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Draft ({draftProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Completed ({completedProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>All ({allProjects.length})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active" className="space-y-4">
                {activeProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active projects</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProjects.map(renderProjectCard)}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="draft" className="space-y-4">
                {draftProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No draft projects</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {draftProjects.map(renderProjectCard)}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {completedProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No completed projects</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedProjects.map(renderProjectCard)}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="all" className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allProjects.map(renderProjectCard)}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Weight Adjustment Dialog */}
      <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Adjust Criteria Weights - {weightProject?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium">Matching Criteria Weights</h4>
                <Badge variant={totalWeight === 100 ? 'default' : 'destructive'}>
                  Total: {totalWeight}%
                </Badge>
              </div>

              <div>
                <Label>Years of Experience ({newWeights.years_experience}%)</Label>
                <Slider
                  value={[newWeights.years_experience]}
                  onValueChange={([value]: number[]) => updateWeight('years_experience', value)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Role Match ({newWeights.role_match}%)</Label>
                <Slider
                  value={[newWeights.role_match]}
                  onValueChange={([value]: number[]) => updateWeight('role_match', value)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Skills Match ({newWeights.skills_match}%)</Label>
                <Slider
                  value={[newWeights.skills_match]}
                  onValueChange={([value]: number[]) => updateWeight('skills_match', value)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Industry Match ({newWeights.industry_match}%)</Label>
                <Slider
                  value={[newWeights.industry_match]}
                  onValueChange={([value]: number[]) => updateWeight('industry_match', value)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Job Stability ({newWeights.job_stability}%)</Label>
                <Slider
                  value={[newWeights.job_stability]}
                  onValueChange={([value]: number[]) => updateWeight('job_stability', value)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              {totalWeight !== 100 && (
                <p className="text-sm text-red-600 mt-4">
                  ⚠️ Weights must sum to exactly 100%. Current total: {totalWeight}%
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsWeightDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateWeights}
                disabled={totalWeight !== 100}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Update & Re-run Matching</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}