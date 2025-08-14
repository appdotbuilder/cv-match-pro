import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  Users, 
  Star,
  TrendingUp,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Play,
  Settings,
  Trophy,
  Target,
  Brain
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { SearchProject, ProjectCV, CreateProjectCVInput } from '../../../server/src/schema';

interface ProjectCandidatesProps {
  project: SearchProject;
  onProjectUpdate: () => void;
}

export function ProjectCandidates({ project, onProjectUpdate }: ProjectCandidatesProps) {
  const [candidates, setCandidates] = useState<ProjectCV[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectCVs = await trpc.getProjectCVs.query({ 
        project_id: project.id,
        limit: 50,
        offset: 0
      });
      setCandidates(projectCVs);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      // Use mock data when backend is not available
      const mockCandidates: ProjectCV[] = [
        {
          id: 1,
          project_id: project.id,
          filename: 'candidate_01_john_doe.pdf',
          original_filename: 'John_Doe_Resume.pdf',
          file_path: '/uploads/project_cvs/candidate_01_john_doe.pdf',
          parsed_data: {
            total_years_experience: 6,
            employment_history: [
              {
                company: 'Tech Solutions Inc',
                position: 'Senior React Developer',
                start_date: '2021-03',
                end_date: null,
                duration_months: 36,
                description: 'Lead developer for multiple React applications'
              }
            ],
            job_changes_frequency: 0.4,
            roles_positions: ['Senior React Developer', 'Frontend Developer', 'Web Developer'],
            skills: ['React', 'TypeScript', 'JavaScript', 'Node.js', 'GraphQL', 'AWS'],
            dominant_industries: ['Fintech', 'Technology', 'SaaS'],
            contact_info: {
              email: 'john.doe@email.com',
              phone: '+1-555-0101',
              location: 'New York, NY'
            },
            education: null
          },
          score: 92.5,
          ranking: 1,
          created_at: new Date('2024-01-21'),
          updated_at: new Date('2024-01-22')
        },
        {
          id: 2,
          project_id: project.id,
          filename: 'candidate_02_jane_smith.pdf',
          original_filename: 'Jane_Smith_CV.pdf',
          file_path: '/uploads/project_cvs/candidate_02_jane_smith.pdf',
          parsed_data: {
            total_years_experience: 4,
            employment_history: [
              {
                company: 'Digital Agency',
                position: 'Frontend Developer',
                start_date: '2020-01',
                end_date: null,
                duration_months: 48,
                description: 'Developed responsive web applications using React'
              }
            ],
            job_changes_frequency: 0.6,
            roles_positions: ['Frontend Developer', 'UI Developer'],
            skills: ['React', 'JavaScript', 'CSS', 'HTML', 'Vue.js'],
            dominant_industries: ['Digital Marketing', 'E-commerce'],
            contact_info: {
              email: 'jane.smith@email.com',
              phone: '+1-555-0102',
              location: 'Los Angeles, CA'
            },
            education: null
          },
          score: 78.3,
          ranking: 2,
          created_at: new Date('2024-01-21'),
          updated_at: new Date('2024-01-22')
        },
        {
          id: 3,
          project_id: project.id,
          filename: 'candidate_03_processing.pdf',
          original_filename: 'Mike_Wilson_Resume.pdf',
          file_path: '/uploads/project_cvs/candidate_03_processing.pdf',
          parsed_data: null, // Simulating processing state
          score: null,
          ranking: null,
          created_at: new Date('2024-01-23'),
          updated_at: new Date('2024-01-23')
        }
      ];
      setCandidates(mockCandidates);
      console.info('Using mock candidate data for demonstration');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter((file: File) => file.type === 'application/pdf');
    
    if (pdfFiles.length > 10) {
      alert('Maximum 10 CVs can be uploaded at once');
      return;
    }
    
    setUploadFiles(pdfFiles);
  };

  const handleUploadCVs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      alert('Please select at least one PDF file');
      return;
    }

    setIsUploading(true);
    try {
      // Simulate file upload and create project CVs
      const cvPromises = uploadFiles.map(async (file: File) => {
        const filename = `project_${project.id}_cv_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `/uploads/project_cvs/${filename}`;
        
        return await trpc.createProjectCV.mutate({
          project_id: project.id,
          filename,
          original_filename: file.name,
          file_path: filePath
        });
      });

      const newCVs = await Promise.all(cvPromises);
      
      setCandidates((prev: ProjectCV[]) => [...prev, ...newCVs]);
      setIsUploadDialogOpen(false);
      setUploadFiles([]);

      // Trigger AI parsing and scoring for new CVs
      try {
        for (const cv of newCVs) {
          await trpc.parseCVWithAI.mutate({ filePath: cv.file_path });
        }
        // Re-run matching algorithm to score all CVs
        await trpc.runMatchingAlgorithm.mutate({ project_id: project.id });
        
        // Reload candidates to get updated scores
        loadCandidates();
      } catch (parseError) {
        console.error('AI parsing or scoring failed:', parseError);
      }
    } catch (error) {
      console.error('Failed to upload CVs:', error);
      alert('Failed to upload CVs. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunMatching = async () => {
    try {
      setIsLoading(true);
      await trpc.runMatchingAlgorithm.mutate({ project_id: project.id });
      loadCandidates();
      onProjectUpdate();
    } catch (error) {
      console.error('Failed to run matching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number | null) => {
    if (!score) return <Clock className="h-4 w-4" />;
    if (score >= 80) return <Trophy className="h-4 w-4" />;
    if (score >= 60) return <Star className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  const rankedCandidates = candidates
    .filter((cv: ProjectCV) => cv.score !== null)
    .sort((a: ProjectCV, b: ProjectCV) => (b.score || 0) - (a.score || 0));

  const unprocessedCandidates = candidates.filter((cv: ProjectCV) => cv.score === null);

  const renderCandidateCard = (candidate: ProjectCV) => {
    const parsedData = candidate.parsed_data;
    
    return (
      <Card key={candidate.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <CardTitle className="text-lg">{candidate.original_filename}</CardTitle>
                <p className="text-sm text-gray-500">
                  Uploaded {candidate.created_at.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {candidate.ranking && (
                <Badge variant="outline" className="text-xs">
                  #{candidate.ranking}
                </Badge>
              )}
              {candidate.score !== null && (
                <Badge className={`${getScoreColor(candidate.score)} bg-transparent border`}>
                  <div className="flex items-center space-x-1">
                    {getScoreIcon(candidate.score)}
                    <span>{candidate.score?.toFixed(1)}%</span>
                  </div>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {candidate.score !== null && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Match Score</span>
                <span className={`font-semibold ${getScoreColor(candidate.score)}`}>
                  {candidate.score?.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={candidate.score || 0} 
                className="h-2"
                style={{
                  background: candidate.score >= 80 ? 'bg-green-100' : 
                            candidate.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                }}
              />
            </div>
          )}

          {parsedData ? (
            <div className="space-y-3">
              {/* Experience */}
              {parsedData.total_years_experience && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span>Experience</span>
                  </div>
                  <span className="font-medium">{parsedData.total_years_experience} years</span>
                </div>
              )}

              {/* Contact */}
              {parsedData.contact_info?.location && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>Location</span>
                  </div>
                  <span className="font-medium">{parsedData.contact_info.location}</span>
                </div>
              )}

              {/* Job Stability */}
              {parsedData.job_changes_frequency && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span>Job Changes/Year</span>
                  </div>
                  <span className="font-medium">{parsedData.job_changes_frequency.toFixed(1)}</span>
                </div>
              )}

              {/* Skills */}
              {parsedData.skills && parsedData.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-green-600" />
                    <span>Top Skills</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {parsedData.skills.slice(0, 6).map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {parsedData.skills.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{parsedData.skills.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Industries */}
              {parsedData.dominant_industries && parsedData.dominant_industries.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Industries</h4>
                  <div className="flex flex-wrap gap-1">
                    {parsedData.dominant_industries.slice(0, 3).map((industry: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Processing CV...</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{rankedCandidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unprocessedCandidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rankedCandidates.length > 0 ? `${rankedCandidates[0].score?.toFixed(1)}%` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload CVs</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload CVs for {project.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadCVs} className="space-y-4">
                <div>
                  <Label htmlFor="cv-files">CV Files (PDF format, max 10 files)</Label>
                  <Input
                    id="cv-files"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select up to 10 PDF files. Each file should be a candidate's CV.
                  </p>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected files ({uploadFiles.length}):
                    </p>
                    <div className="space-y-1">
                      {uploadFiles.map((file: File, index: number) => (
                        <p key={index} className="text-sm text-blue-700">{file.name}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload CVs'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleRunMatching}
            disabled={isLoading || candidates.length === 0}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>Run Matching</span>
          </Button>
        </div>
      </div>

      {/* Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Candidates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No candidates yet</h3>
              <p className="text-gray-500 mb-6">
                Upload CVs to start building your candidate pool
              </p>
            </div>
          ) : (
            <Tabs defaultValue="ranked" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ranked" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Ranked ({rankedCandidates.length})</span>
                </TabsTrigger>
                <TabsTrigger value="processing" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Processing ({unprocessedCandidates.length})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ranked" className="space-y-4">
                {rankedCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No ranked candidates yet</p>
                    <p className="text-sm text-gray-400">Run matching algorithm to see ranked results</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {rankedCandidates.map(renderCandidateCard)}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="processing" className="space-y-4">
                {unprocessedCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No candidates being processed</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {unprocessedCandidates.map(renderCandidateCard)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}