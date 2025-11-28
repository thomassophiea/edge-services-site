import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Key,
  Mail,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Administrator {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operator' | 'viewer';
  enabled: boolean;
  lastLogin?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export function AdministratorsManagement() {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer' as Administrator['role'],
    enabled: true,
    twoFactorEnabled: false
  });

  useEffect(() => {
    loadAdministrators();
  }, []);

  const loadAdministrators = async () => {
    setLoading(true);
    try {
      // Generate mock administrators
      const mockAdmins: Administrator[] = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'super_admin',
          enabled: true,
          lastLogin: new Date(Date.now() - 3600000).toISOString(),
          createdAt: '2025-01-01T00:00:00Z',
          twoFactorEnabled: true
        },
        {
          id: '2',
          username: 'operator1',
          email: 'operator@example.com',
          role: 'operator',
          enabled: true,
          lastLogin: new Date(Date.now() - 86400000).toISOString(),
          createdAt: '2025-06-15T00:00:00Z',
          twoFactorEnabled: false
        },
        {
          id: '3',
          username: 'viewer1',
          email: 'viewer@example.com',
          role: 'viewer',
          enabled: true,
          lastLogin: new Date(Date.now() - 172800000).toISOString(),
          createdAt: '2025-08-20T00:00:00Z',
          twoFactorEnabled: false
        },
        {
          id: '4',
          username: 'disabled_user',
          email: 'disabled@example.com',
          role: 'operator',
          enabled: false,
          createdAt: '2025-09-10T00:00:00Z',
          twoFactorEnabled: false
        }
      ];

      setAdministrators(mockAdmins);
    } catch (error) {
      console.error('Failed to load administrators:', error);
      toast.error('Failed to load administrators');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (admin?: Administrator) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        username: admin.username,
        email: admin.email,
        password: '',
        confirmPassword: '',
        role: admin.role,
        enabled: admin.enabled,
        twoFactorEnabled: admin.twoFactorEnabled
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'viewer',
        enabled: true,
        twoFactorEnabled: false
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAdmin(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'viewer',
      enabled: true,
      twoFactorEnabled: false
    });
  };

  const handleSaveAdministrator = async () => {
    // Validation
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!editingAdmin) {
      // Creating new admin - password required
      if (!formData.password) {
        toast.error('Password is required');
        return;
      }

      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    } else {
      // Editing existing admin - password optional
      if (formData.password && formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    try {
      if (editingAdmin) {
        // Update existing administrator
        const updatedAdmins = administrators.map(admin =>
          admin.id === editingAdmin.id
            ? {
                ...admin,
                username: formData.username,
                email: formData.email,
                role: formData.role,
                enabled: formData.enabled,
                twoFactorEnabled: formData.twoFactorEnabled
              }
            : admin
        );
        setAdministrators(updatedAdmins);
        toast.success('Administrator updated successfully');
      } else {
        // Create new administrator
        const newAdmin: Administrator = {
          id: Date.now().toString(),
          username: formData.username,
          email: formData.email,
          role: formData.role,
          enabled: formData.enabled,
          createdAt: new Date().toISOString(),
          twoFactorEnabled: formData.twoFactorEnabled
        };
        setAdministrators([...administrators, newAdmin]);
        toast.success('Administrator created successfully');
      }

      handleCloseDialog();
    } catch (error) {
      toast.error('Failed to save administrator');
    }
  };

  const handleDeleteAdministrator = (admin: Administrator) => {
    if (admin.role === 'super_admin') {
      toast.error('Cannot delete super admin account');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete administrator "${admin.username}"?`
    );

    if (!confirmed) return;

    setAdministrators(administrators.filter(a => a.id !== admin.id));
    toast.success('Administrator deleted successfully');
  };

  const handleToggleEnabled = (admin: Administrator, enabled: boolean) => {
    if (admin.role === 'super_admin') {
      toast.error('Cannot disable super admin account');
      return;
    }

    const updatedAdmins = administrators.map(a =>
      a.id === admin.id ? { ...a, enabled } : a
    );
    setAdministrators(updatedAdmins);
    toast.success(enabled ? 'Administrator enabled' : 'Administrator disabled');
  };

  const getRoleBadge = (role: Administrator['role']) => {
    const colors: Record<Administrator['role'], string> = {
      super_admin: 'bg-purple-500',
      admin: 'bg-blue-500',
      operator: 'bg-green-500',
      viewer: 'bg-gray-500'
    };

    const labels: Record<Administrator['role'], string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      operator: 'Operator',
      viewer: 'Viewer'
    };

    return (
      <Badge className={colors[role]}>
        {labels[role]}
      </Badge>
    );
  };

  const getRoleDescription = (role: Administrator['role']) => {
    const descriptions: Record<Administrator['role'], string> = {
      super_admin: 'Full system access including user management',
      admin: 'Configuration and management access',
      operator: 'Operational access with limited configuration',
      viewer: 'Read-only access to view system status'
    };

    return descriptions[role];
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Administrators Management
          </h2>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Administrator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? 'Edit Administrator' : 'Add Administrator'}
              </DialogTitle>
              <DialogDescription>
                {editingAdmin
                  ? 'Update administrator account details'
                  : 'Create a new administrator account'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin123"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Password {editingAdmin && '(leave blank to keep current)'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: Administrator['role']) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">
                      <div>
                        <div className="font-medium">Super Admin</div>
                        <div className="text-xs text-muted-foreground">
                          Full system access
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">
                          Configuration access
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="operator">
                      <div>
                        <div className="font-medium">Operator</div>
                        <div className="text-xs text-muted-foreground">
                          Operational access
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">
                          Read-only access
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Account Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow user to log in
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    Require 2FA for login
                  </p>
                </div>
                <Switch
                  checked={formData.twoFactorEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, twoFactorEnabled: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSaveAdministrator}>
                {editingAdmin ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrator Accounts</CardTitle>
          <CardDescription>
            {administrators.length} administrator{administrators.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {administrators.map(admin => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {admin.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {admin.email}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(admin.role)}</TableCell>
                  <TableCell>
                    {admin.twoFactorEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {admin.lastLogin ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(admin.lastLogin).toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={admin.enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(admin, checked)}
                      disabled={admin.role === 'super_admin'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAdministrator(admin)}
                        disabled={admin.role === 'super_admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
