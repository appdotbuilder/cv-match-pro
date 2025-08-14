import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Search, 
  Upload, 
  FileText, 
  Users, 
  Target,
  Briefcase,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Settings
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { ProjectForm } from '@/components/ProjectForm';
import { ProjectCandidates } from '@/components/ProjectCandidates';
import type { User, SearchProject, ProjectCV } from '../../../server/src/schema';

interface JobProviderDashboardProps {
  user: User;
}

export function JobProviderDashboard({ user }: JobProviderDashboardProps) {
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SearchProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const userProjects = await trpc.getProjectsByUser.query({ user_id: user.id });
      setProjects(userProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      // Use mock data when backend is not available
      if (user.role === 'JOB_PROVIDER') {
        const mockProjects: SearchProject[] = [
          {
            id: 1,
            name: 'Senior Frontend Developer Search',
            description: 'Looking for an experienced React developer for our fintech startup',
            created_by_user_id: user.id,
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
            created_by_user_id: user.id,
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
          }
        ];
        setProjects(mockProjects);
        console.info('Using mock project data for demonstration');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectCreate = () => {
    setIsCreateDialogOpen(false);
    loadProjects();
  };

  const handleRunMatching = async (project: SearchProject) => {
    try {
      await trpc.runMatchingAlgorithm.mutate({ project_id: project.id });
      // Refresh project data
      loadProjects();
      if (selectedProject?.id === project.id) {
        const updatedProject = await trpc.getProjectDetails.query({ projectId: project.id });
        setSelectedProject(updatedProject);
      }
    } catch (error) {
      console.error('Failed to run matching algorithm:', error);
    }
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

  const draftProjects = projects.filter((p: SearchProject) => p.status === 'DRAFT');
  const activeProjects = projects.filter((p: SearchProject) => p.status === 'ACTIVE');
  const completedProjects = projects.filter((p: SearchProject) => p.status === 'COMPLETED');

  const renderProjectCard = (project: SearchProject) => (
    <Card 
      key={project.id} 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-blue-200"
      onClick={() => setSelectedProject(project)}
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Created:</span>
            <span>{project.created_at.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Updated:</span>
            <span>{project.updated_at.toLocaleDateString()}</span>
          </div>
          
          {/* Quick criteria preview */}
          {project.criteria && (
            <div className="pt-2 border-t">
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
                    {project.criteria.required_skills.length} skills required
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleRunMatching(project);
            }}
            className="flex items-center space-x-1"
          >
            <Play className="h-3 w-3" />
            <span>Run Matching</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
          >
            View Details →
          </Button>
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
              ← Back to Projects
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
        
        <ProjectCandidates project={selectedProject} onProjectUpdate={loadProjects} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Draft Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedProjects.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Search Projects</span>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Search Project</DialogTitle>
                </DialogHeader>
                <ProjectForm 
                  userId={user.id} 
                  onSuccess={handleProjectCreate}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first search project to start finding candidates
              </p>
            </div>
          ) : (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="draft" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Draft ({draftProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Active ({activeProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Completed ({completedProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>All ({projects.length})</span>
                </TabsTrigger>
              </TabsList>
              
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
              
              <TabsContent value="completed" className="space-y-4">
                {completedProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
                  {projects.map(renderProjectCard)}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}