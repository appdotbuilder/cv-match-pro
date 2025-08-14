import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Plus, Users } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, UserRole, CreateUserInput } from '../../../server/src/schema';

interface UserSelectionProps {
  users: User[];
  onUserSelect: (user: User) => void;
  onRefresh: () => void;
  isLoading: boolean;
  getRoleIcon: (role: UserRole) => React.ReactNode;
  getRoleColor: (role: UserRole) => string;
}

export function UserSelection({ 
  users, 
  onUserSelect, 
  onRefresh, 
  isLoading, 
  getRoleIcon, 
  getRoleColor 
}: UserSelectionProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'JOB_SEEKER'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await trpc.createUser.mutate(createForm);
      setIsCreateDialogOpen(false);
      setCreateForm({
        email: '',
        first_name: '',
        last_name: '',
        role: 'JOB_SEEKER'
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. This is a demo application - user creation requires a backend connection. Please try selecting from the existing demo users instead.');
    } finally {
      setIsCreating(false);
    }
  };

  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<UserRole, User[]>);

  const roleOrder: UserRole[] = ['JOB_SEEKER', 'JOB_PROVIDER', 'TALENT_ACQUISITION'];

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-gray-600" />
              <CardTitle className="text-2xl">Select User Profile</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create User</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={createForm.first_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateForm((prev: CreateUserInput) => ({
                              ...prev,
                              first_name: e.target.value
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={createForm.last_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateForm((prev: CreateUserInput) => ({
                              ...prev,
                              last_name: e.target.value
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={createForm.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateUserInput) => ({
                            ...prev,
                            email: e.target.value
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={createForm.role}
                        onValueChange={(value: UserRole) =>
                          setCreateForm((prev: CreateUserInput) => ({
                            ...prev,
                            role: value
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JOB_SEEKER">Job Seeker</SelectItem>
                          <SelectItem value="JOB_PROVIDER">Job Provider</SelectItem>
                          <SelectItem value="TALENT_ACQUISITION">Talent Acquisition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                onClick={onRefresh} 
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 mb-2">No users found</p>
              <p className="text-gray-400 mb-6">Create your first user to get started</p>
            </div>
          ) : (
            <Tabs defaultValue={roleOrder[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                {roleOrder.map((role: UserRole) => (
                  <TabsTrigger key={role} value={role} className="flex items-center space-x-2">
                    {getRoleIcon(role)}
                    <span>{role.replace('_', ' ')}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {groupedUsers[role]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {roleOrder.map((role: UserRole) => (
                <TabsContent key={role} value={role}>
                  {!groupedUsers[role] || groupedUsers[role].length === 0 ? (
                    <div className="text-center py-8">
                      <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                        {getRoleIcon(role)}
                      </div>
                      <p className="text-gray-500">No {role.replace('_', ' ').toLowerCase()}s found</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedUsers[role].map((user: User) => (
                        <Card 
                          key={user.id}
                          className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-blue-200"
                          onClick={() => onUserSelect(user)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {user.first_name} {user.last_name}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                              </div>
                              <Badge className={`${getRoleColor(user.role)} text-xs`}>
                                {user.role.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              Created: {user.created_at.toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}