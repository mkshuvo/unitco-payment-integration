'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material';
import { Search, Edit, PersonAdd, Security } from '@mui/icons-material';
import { getCurrentUser, hasRole, User } from '../../../lib/auth';

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  lastLoginTime: string | null;
  unitCustomerId: string | null;
  createdTime: string;
  updatedTime: string;
}

export default function AdminUsersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const itemsPerPage = 10;
  const router = useRouter();

  const availableRoles = ['ADMIN', 'ACCOUNTANT', 'USER'];

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        if (!hasRole(currentUser, 'ADMIN')) {
          router.push('/dashboard');
          return;
        }

        setUser(currentUser);

        // Load all users for admin view
        const response = await fetch(`/api/admin/users?page=${page}&size=${itemsPerPage}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.data || []);
          setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
        } else {
          setError('Failed to load users');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, page]);

  useEffect(() => {
    // Filter users based on search term
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditRoles(user.roles);
    setEditDialogOpen(true);
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles: editRoles }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === selectedUser.id 
            ? { ...u, roles: editRoles }
            : u
        ));
        setEditDialogOpen(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update user roles');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'ACCOUNTANT': return 'warning';
      case 'USER': return 'primary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user || !hasRole(user, 'ADMIN')) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Access denied. Admin privileges required.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            User Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => router.push('/admin/users/create')}
          >
            Create User
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by email, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Statistics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">{users.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Users</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {users.filter(u => u.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Active Users</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {users.filter(u => u.roles.includes('ADMIN')).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Admins</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {users.filter(u => u.unitCustomerId).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Unit Customers</Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Unit Customer</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((adminUser) => (
                <TableRow key={adminUser.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {adminUser.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {adminUser.fullName || 'No name provided'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {adminUser.roles.map((role) => (
                        <Chip 
                          key={role}
                          label={role} 
                          color={getRoleColor(role) as any}
                          size="small" 
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={adminUser.isActive ? 'Active' : 'Inactive'} 
                      color={adminUser.isActive ? 'success' : 'default'}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {adminUser.unitCustomerId ? (
                      <Chip label="Connected" color="success" size="small" />
                    ) : (
                      <Chip label="Not Connected" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {adminUser.lastLoginTime 
                        ? new Date(adminUser.lastLoginTime).toLocaleDateString()
                        : 'Never'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(adminUser.createdTime).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      title="Edit Roles"
                      onClick={() => handleEditUser(adminUser)}
                    >
                      <Security />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}

        {filteredUsers.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No users found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try adjusting your search criteria' : 'No users have been created yet'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Edit Roles Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Roles</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User: {selectedUser.email}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={editRoles}
                  onChange={(e) => setEditRoles(e.target.value as string[])}
                  input={<OutlinedInput label="Roles" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          color={getRoleColor(value) as any}
                          size="small" 
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRoles} variant="contained">
            Update Roles
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
