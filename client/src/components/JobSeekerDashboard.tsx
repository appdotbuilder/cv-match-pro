import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star,
  Briefcase,
  MapPin,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CV, CreateCVInput, UpdateCVInput, ParsedCVData } from '../../../server/src/schema';

interface JobSeekerDashboardProps {
  user: User;
}

export function JobSeekerDashboard({ user }: JobSeekerDashboardProps) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<Omit<CreateCVInput, 'user_id'>>({
    filename: '',
    original_filename: '',
    file_path: '',
    status: 'INACTIVE'
  });

  const loadCVs = useCallback(async () => {
    setIsLoading(true);
    try {
      const userCVs = await trpc.getCVsByUser.query({ user_id: user.id });
      setCvs(userCVs);
    } catch (error) {
      console.error('Failed to load CVs:', error);
      // Use mock data when backend is not available
      if (user.role === 'JOB_SEEKER') {
        const mockCVs: CV[] = [
          {
            id: 1,
            user_id: user.id,
            filename: 'cv_john_seeker_2024.pdf',
            original_filename: 'John_Seeker_Resume_2024.pdf',
            file_path: '/uploads/cvs/cv_john_seeker_2024.pdf',
            status: 'ACTIVE',
            parsed_data: {
              total_years_experience: 5,
              employment_history: [
                {
                  company: 'Tech Corp',
                  position: 'Senior Developer',
                  start_date: '2022-01',
                  end_date: null,
                  duration_months: 24,
                  description: 'Led development of web applications using React and Node.js'
                },
                {
                  company: 'StartupXYZ',
                  position: 'Full Stack Developer',
                  start_date: '2019-06',
                  end_date: '2021-12',
                  duration_months: 30,
                  description: 'Built scalable web applications and APIs'
                }
              ],
              job_changes_frequency: 0.5,
              roles_positions: ['Senior Developer', 'Full Stack Developer', 'Frontend Developer'],
              skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'PostgreSQL', 'Docker'],
              dominant_industries: ['Technology', 'Software Development', 'Fintech'],
              contact_info: {
                email: user.email,
                phone: '+1-555-0123',
                location: 'San Francisco, CA'
              },
              education: [
                {
                  institution: 'University of Technology',
                  degree: 'Bachelor of Science',
                  field: 'Computer Science',
                  graduation_year: 2019
                }
              ]
            },
            created_at: new Date('2024-01-15'),
            updated_at: new Date('2024-01-15')
          },
          {
            id: 2,
            user_id: user.id,
            filename: 'cv_john_seeker_alt.pdf',
            original_filename: 'John_Seeker_Alternative.pdf',
            file_path: '/uploads/cvs/cv_john_seeker_alt.pdf',
            status: 'INACTIVE',
            parsed_data: null, // Simulating pending parsing
            created_at: new Date('2024-01-10'),
            updated_at: new Date('2024-01-10')
          }
        ];
        setCvs(mockCVs);
        console.info('Using mock CV data for demonstration');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role, user.email]);

  useEffect(() => {
    loadCVs();
  }, [loadCVs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file upload - in real implementation, this would upload to server
      const filename = `cv_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `/uploads/cvs/${filename}`;
      setUploadForm((prev: Omit<CreateCVInput, 'user_id'>) => ({
        ...prev,
        filename,
        original_filename: file.name,
        file_path: filePath
      }));
    }
  };

  const handleUploadCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.filename) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      const newCV = await trpc.createCV.mutate({
        ...uploadForm,
        user_id: user.id
      });
      
      setCvs((prev: CV[]) => [...prev, newCV]);
      setIsUploadDialogOpen(false);
      setUploadForm({
        filename: '',
        original_filename: '',
        file_path: '',
        status: 'INACTIVE'
      });

      // Trigger AI parsing
      try {
        await trpc.parseCVWithAI.mutate({ filePath: newCV.file_path });
        // Reload CVs to get updated parsed data
        loadCVs();
      } catch (parseError) {
        console.error('AI parsing failed:', parseError);
      }
    } catch (error) {
      console.error('Failed to upload CV:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleStatus = async (cv: CV) => {
    try {
      const newStatus = cv.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      
      // If setting to active, first set all others to inactive
      if (newStatus === 'ACTIVE') {
        const activeCV = cvs.find((c: CV) => c.status === 'ACTIVE');
        if (activeCV) {
          await trpc.updateCVStatus.mutate({
            id: activeCV.id,
            status: 'INACTIVE'
          });
        }
      }

      await trpc.updateCVStatus.mutate({
        id: cv.id,
        status: newStatus
      });

      loadCVs(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to update CV status:', error);
    }
  };

  const activeCVs = cvs.filter((cv: CV) => cv.status === 'ACTIVE');
  const inactiveCVs = cvs.filter((cv: CV) => cv.status === 'INACTIVE');

  const renderParsedData = (parsedData: ParsedCVData | null) => {
    if (!parsedData) {
      return (
        <div className="text-center py-6">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">CV parsing in progress...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Experience Summary */}
        {parsedData.total_years_experience && (
          <div className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {parsedData.total_years_experience} years of experience
            </span>
          </div>
        )}

        {/* Contact Info */}
        {parsedData.contact_info && (
          <div className="space-y-2">
            {parsedData.contact_info.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{parsedData.contact_info.email}</span>
              </div>
            )}
            {parsedData.contact_info.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{parsedData.contact_info.phone}</span>
              </div>
            )}
            {parsedData.contact_info.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{parsedData.contact_info.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {parsedData.skills && parsedData.skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Key Skills</h4>
            <div className="flex flex-wrap gap-1">
              {parsedData.skills.slice(0, 8).map((skill: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {parsedData.skills.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{parsedData.skills.length - 8} more
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
              {parsedData.dominant_industries.map((industry: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Job Stability */}
        {parsedData.job_changes_frequency && (
          <div>
            <h4 className="text-sm font-medium mb-2">Job Stability</h4>
            <div className="text-sm text-gray-600">
              {parsedData.job_changes_frequency.toFixed(1)} job changes per year
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCVCard = (cv: CV) => (
    <Card key={cv.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">{cv.original_filename}</CardTitle>
              <p className="text-sm text-gray-500">
                Uploaded {cv.created_at.toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={cv.status === 'ACTIVE' ? 'default' : 'secondary'}
              className="flex items-center space-x-1"
            >
              {cv.status === 'ACTIVE' ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              <span>{cv.status}</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(cv)}
              className="text-xs"
            >
              {cv.status === 'ACTIVE' ? 'Deactivate' : 'Set Active'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderParsedData(cv.parsed_data)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total CVs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cvs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active CVs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCVs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive CVs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{inactiveCVs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Profile Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {activeCVs.length > 0 ? '✅' : '⏳'}
              </div>
              <span className="text-sm font-medium">
                {activeCVs.length > 0 ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload CV Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>CV Management</span>
            </CardTitle>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload New CV</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New CV</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUploadCV} className="space-y-4">
                  <div>
                    <Label htmlFor="cv-file">CV File (PDF format)</Label>
                    <Input
                      id="cv-file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only PDF files are supported. Maximum size: 10MB
                    </p>
                  </div>
                  {uploadForm.original_filename && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">Selected file:</p>
                      <p className="text-sm text-blue-700">{uploadForm.original_filename}</p>
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
                      {isUploading ? 'Uploading...' : 'Upload CV'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading CVs...</p>
            </div>
          ) : cvs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No CVs uploaded yet</h3>
              <p className="text-gray-500 mb-6">
                Upload your first CV to start building your profile
              </p>
            </div>
          ) : (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="active" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Active CVs ({activeCVs.length})</span>
                </TabsTrigger>
                <TabsTrigger value="inactive" className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4" />
                  <span>Inactive CVs ({inactiveCVs.length})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active" className="space-y-4">
                {activeCVs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active CVs</p>
                    <p className="text-sm text-gray-400">Set a CV as active to make it visible to employers</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeCVs.map(renderCVCard)}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="inactive" className="space-y-4">
                {inactiveCVs.length === 0 ? (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No inactive CVs</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inactiveCVs.map(renderCVCard)}
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