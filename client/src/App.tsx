import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Users, Target, Upload, Search, Info } from 'lucide-react';

// Import role-specific components
import { JobSeekerDashboard } from '@/components/JobSeekerDashboard';
import { JobProviderDashboard } from '@/components/JobProviderDashboard';
import { TalentAcquisitionDashboard } from '@/components/TalentAcquisitionDashboard';
import { UserSelection } from '@/components/UserSelection';

// Import types
import type { User, UserRole } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Load users for demo purposes
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobSeekers, jobProviders, talentAcquisition] = await Promise.all([
        trpc.getUsersByRole.query({ role: 'JOB_SEEKER' }),
        trpc.getUsersByRole.query({ role: 'JOB_PROVIDER' }),
        trpc.getUsersByRole.query({ role: 'TALENT_ACQUISITION' })
      ]);
      setUsers([...jobSeekers, ...jobProviders, ...talentAcquisition]);
    } catch (error) {
      console.error('Failed to load users:', error);
      setIsDemoMode(true);
      // Use mock data when backend is not available
      const mockUsers: User[] = [
        {
          id: 1,
          email: 'john.seeker@example.com',
          first_name: 'John',
          last_name: 'Seeker',
          role: 'JOB_SEEKER',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 2,
          email: 'jane.provider@company.com',
          first_name: 'Jane',
          last_name: 'Provider',
          role: 'JOB_PROVIDER',
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        },
        {
          id: 3,
          email: 'bob.talent@hr.com',
          first_name: 'Bob',
          last_name: 'Talent',
          role: 'TALENT_ACQUISITION',
          created_at: new Date('2024-01-05'),
          updated_at: new Date('2024-01-05')
        },
        {
          id: 4,
          email: 'alice.developer@example.com',
          first_name: 'Alice',
          last_name: 'Developer',
          role: 'JOB_SEEKER',
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-01-20')
        },
        {
          id: 5,
          email: 'mike.recruiter@company.com',
          first_name: 'Mike',
          last_name: 'Recruiter',
          role: 'JOB_PROVIDER',
          created_at: new Date('2024-01-08'),
          updated_at: new Date('2024-01-08')
        }
      ];
      setUsers(mockUsers);
      console.info('Using mock data for demonstration purposes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'JOB_SEEKER':
        return <Search className="h-5 w-5" />;
      case 'JOB_PROVIDER':
        return <Briefcase className="h-5 w-5" />;
      case 'TALENT_ACQUISITION':
        return <Target className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'JOB_SEEKER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'JOB_PROVIDER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TALENT_ACQUISITION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleUserRefresh = () => {
    loadUsers();
  };

  // Show role dashboard if user is selected
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    CV Match Pro
                  </h1>
                </div>
                <Badge className={`${getRoleColor(currentUser.role)} flex items-center space-x-1`}>
                  {getRoleIcon(currentUser.role)}
                  <span>{currentUser.role.replace('_', ' ')}</span>
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{currentUser.first_name} {currentUser.last_name}</span>
                  <div className="text-xs text-gray-500">{currentUser.email}</div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentUser(null)}
                  className="hover:bg-gray-50"
                >
                  Switch User
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific dashboard */}
        <div className="container mx-auto px-4 py-6">
          {/* Demo Mode Alert for dashboards */}
          {isDemoMode && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Demo Mode:</strong> Displaying sample data for demonstration purposes. In production, this would connect to your backend system.
              </AlertDescription>
            </Alert>
          )}
          {currentUser.role === 'JOB_SEEKER' && (
            <JobSeekerDashboard user={currentUser} />
          )}
          {currentUser.role === 'JOB_PROVIDER' && (
            <JobProviderDashboard user={currentUser} />
          )}
          {currentUser.role === 'TALENT_ACQUISITION' && (
            <TalentAcquisitionDashboard user={currentUser} />
          )}
        </div>
      </div>
    );
  }

  // Show user selection screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Demo Mode Alert */}
        {isDemoMode && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <strong>Demo Mode:</strong> Backend connection not available. The application is running with demonstration data to showcase all features and functionality.
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CV Match Pro
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive CV management and intelligent job matching platform 
            for job seekers, providers, and talent acquisition teams
          </p>
        </div>

        {/* Role descriptions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg text-blue-800">Job Seeker</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Create profiles, upload multiple CVs, and manage your job search portfolio 
                with the ability to set active CVs.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:border-green-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg text-green-800">Job Provider</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Create search projects with custom criteria, upload candidate CVs, 
                and leverage AI-powered matching and scoring.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 hover:border-purple-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg text-purple-800">Talent Acquisition</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Monitor hiring pipelines, adjust matching criteria weights, 
                and finalize candidate shortlists across all projects.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User selection */}
        <UserSelection 
          users={users} 
          onUserSelect={setCurrentUser} 
          onRefresh={handleUserRefresh}
          isLoading={isLoading}
          getRoleIcon={getRoleIcon}
          getRoleColor={getRoleColor}
        />
      </div>
    </div>
  );
}

export default App;