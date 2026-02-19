import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Key, 
  UserX, 
  UserCheck,
  Copy,
  Upload,
  X,
  Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const UsersPage = () => {
  const { token, API_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'FUND_MANAGER'
  });
  const [newUserAvatar, setNewUserAvatar] = useState(null);
  const [newUserAvatarPreview, setNewUserAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const createFileInputRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchFunds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/funds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFunds(response.data);
    } catch (error) {
      console.error('Failed to fetch funds:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchUsers(), fetchFunds()]);
      setLoading(false);
    };
    init();
  }, [token, API_URL]);

  const handleCreateUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const createdUser = response.data.user;
      
      // Upload avatar if selected
      if (newUserAvatar && createdUser?.id) {
        const formData = new FormData();
        formData.append('file', newUserAvatar);
        try {
          await axios.post(
            `${API_URL}/api/users/${createdUser.id}/avatar`,
            formData,
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              } 
            }
          );
        } catch (avatarError) {
          console.error('Avatar upload failed:', avatarError);
        }
      }
      
      setGeneratedPassword(response.data.generated_password);
      setShowCreateDialog(false);
      setShowPasswordDialog(true);
      setNewUser({ first_name: '', last_name: '', email: '', role: 'FUND_MANAGER' });
      setNewUserAvatar(null);
      setNewUserAvatarPreview(null);
      await fetchUsers();
      toast.success('User created successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGeneratedPassword(response.data.new_password);
      setShowPasswordDialog(true);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleToggleStatus = async (user) => {
    const endpoint = user.status === 'ACTIVE' ? 'deactivate' : 'activate';
    try {
      await axios.post(
        `${API_URL}/api/users/${user.id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUsers();
      toast.success(`User ${endpoint}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${endpoint} user`);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(
        `${API_URL}/api/users/${selectedUser.id}/avatar`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      await fetchUsers();
      setShowAvatarDialog(false);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload avatar');
    }
  };

  const handleNewUserAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setNewUserAvatar(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewUserAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = async (text) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Copied to clipboard!');
    } catch (err) {
      // If all else fails, show the password in an alert
      toast.error('Could not copy automatically. Please copy manually.');
      console.error('Copy failed:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const search = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getUserFunds = (user) => {
    if (!user.assigned_funds?.length) return 'None';
    const fundNames = user.assigned_funds
      .map(fid => funds.find(f => f.id === fid)?.name)
      .filter(Boolean);
    return fundNames.length ? fundNames.join(', ') : 'None';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-[#94A3B8] mt-1">Manage portal users and their access</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="text-white"
          style={{
            background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)',
            boxShadow: '0 0 20px rgba(0, 71, 171, 0.4)'
          }}
          data-testid="create-user-button"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569] focus:border-[#0047AB]"
          data-testid="search-users-input"
        />
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[#1A2744] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
        }}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-[#1A2744] hover:bg-transparent">
              <TableHead className="text-[#94A3B8] font-semibold">User</TableHead>
              <TableHead className="text-[#94A3B8] font-semibold">Role</TableHead>
              <TableHead className="text-[#94A3B8] font-semibold">Status</TableHead>
              <TableHead className="text-[#94A3B8] font-semibold">Last Login</TableHead>
              <TableHead className="text-[#94A3B8] font-semibold">Assigned Funds</TableHead>
              <TableHead className="text-[#94A3B8] font-semibold w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow 
                key={user.id} 
                className="border-[#1A2744] hover:bg-[#0047AB]/10"
                data-testid={`user-row-${user.id}`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 cursor-pointer" onClick={() => {
                      setSelectedUser(user);
                      setShowAvatarDialog(true);
                    }}>
                      <AvatarImage src={user.avatar_url ? `${API_URL}${user.avatar_url}` : undefined} />
                      <AvatarFallback className="bg-[#0047AB] text-white">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-[#94A3B8]">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN' 
                      ? 'bg-[#0047AB]/20 text-[#00A3FF]' 
                      : 'bg-[#002D72]/20 text-[#94A3B8]'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      user.status === 'ACTIVE' 
                        ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)]' 
                        : 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`} />
                    <span className="text-white text-sm">{user.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#94A3B8] text-sm">
                  {formatDate(user.last_login)}
                </TableCell>
                <TableCell className="text-[#94A3B8] text-sm max-w-[200px] truncate">
                  {getUserFunds(user)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 text-[#94A3B8] hover:text-white hover:bg-[#0047AB]/20"
                        data-testid={`user-actions-${user.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      className="bg-[#0A1628] border-[#1A2744]"
                    >
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAvatarDialog(true);
                        }}
                        className="text-white focus:bg-[#0047AB]/20 focus:text-white cursor-pointer"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleResetPassword(user.id)}
                        className="text-white focus:bg-[#0047AB]/20 focus:text-white cursor-pointer"
                        data-testid={`reset-password-${user.id}`}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(user)}
                        className={`cursor-pointer ${
                          user.status === 'ACTIVE'
                            ? 'text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444]'
                            : 'text-[#22C55E] focus:bg-[#22C55E]/10 focus:text-[#22C55E]'
                        }`}
                        data-testid={`toggle-status-${user.id}`}
                      >
                        {user.status === 'ACTIVE' ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-[#94A3B8]">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white">
          <DialogHeader>
            <DialogTitle className="font-bold">Create New User</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Add a new user to the portal. A password will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={newUserAvatarPreview || undefined} />
                  <AvatarFallback className="bg-[#0047AB] text-white text-2xl">
                    {getInitials(newUser.first_name, newUser.last_name) || '?'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => createFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#0047AB] text-white hover:bg-[#0052CC] transition-colors"
                  data-testid="create-user-avatar-button"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewUserAvatarSelect}
                  className="hidden"
                  data-testid="create-user-avatar-input"
                />
              </div>
            </div>
            <p className="text-center text-sm text-[#94A3B8]">Click camera icon to add photo</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">First Name</Label>
                <Input
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                  data-testid="new-user-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Last Name</Label>
                <Input
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                  data-testid="new-user-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                data-testid="new-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white" data-testid="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  <SelectItem value="FUND_MANAGER" className="text-white focus:bg-[#0047AB]/20">
                    Fund Manager
                  </SelectItem>
                  <SelectItem value="ADMIN" className="text-white focus:bg-[#0047AB]/20">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewUserAvatar(null);
                setNewUserAvatarPreview(null);
              }}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isSubmitting}
              className="text-white"
              style={{
                background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
              }}
              data-testid="submit-create-user"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Display Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white">
          <DialogHeader>
            <DialogTitle className="font-bold">Generated Password</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Copy this password now. It won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#02040A] border border-[#1A2744] rounded-lg p-3 font-mono text-[#22C55E]">
                {generatedPassword}
              </code>
              <Button
                onClick={() => copyToClipboard(generatedPassword)}
                style={{
                  background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
                }}
                data-testid="copy-password-button"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPasswordDialog(false)}
              className="text-white"
              style={{
                background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white">
          <DialogHeader>
            <DialogTitle className="font-bold">Upload Profile Photo</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Upload a photo for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={selectedUser?.avatar_url ? `${API_URL}${selectedUser.avatar_url}` : undefined} />
                <AvatarFallback className="bg-[#0047AB] text-white text-2xl">
                  {getInitials(selectedUser?.first_name, selectedUser?.last_name)}
                </AvatarFallback>
              </Avatar>
              <Label 
                htmlFor="avatar-upload" 
                className="cursor-pointer text-white px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
                }}
              >
                Choose File
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                data-testid="avatar-upload-input"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
