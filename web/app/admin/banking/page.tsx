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
} from '@mui/material';
import { Search, Visibility, Edit } from '@mui/icons-material';
import { getCurrentUser, hasRole, User } from '../../../lib/auth';

interface AdminBankAccount {
  id: number;
  userId: number;
  userEmail: string;
  accountNumber: string;
  holderName: string;
  bankName: string;
  routingNumber: string;
  method: 'ACH' | 'WIRE';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  isPrimary: boolean;
  unitStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdTime: string;
  updatedTime: string;
}

export default function AdminBankingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<AdminBankAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();

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

        // Load all bank accounts for admin view
        const response = await fetch(`/api/admin/bank/accounts?page=${page}&size=${itemsPerPage}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setAccounts(data.data || []);
          setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
        } else {
          setError('Failed to load bank accounts');
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
    // Filter accounts based on search term
    if (!searchTerm) {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(account => 
        account.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountNumber.includes(searchTerm)
      );
      setFilteredAccounts(filtered);
    }
  }, [accounts, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'INACTIVE': return 'default';
      case 'REJECTED': return 'error';
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
        <Typography variant="h4" component="h1" gutterBottom>
          Banking Administration
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage all user bank accounts and Unit integration status
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by email, holder name, bank name, or account number..."
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
              <Typography variant="h6">{accounts.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Accounts</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {accounts.filter(acc => acc.status === 'ACTIVE').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Active Accounts</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {accounts.filter(acc => acc.unitStatus === 'ACTIVE').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Unit Verified</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {accounts.filter(acc => acc.unitStatus === 'PENDING').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pending Verification</Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Accounts Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Account Holder</TableCell>
                <TableCell>Bank Details</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Unit Status</TableCell>
                <TableCell>Primary</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {account.userEmail}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {account.userId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{account.holderName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{account.bankName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ****{account.accountNumber.slice(-4)} • {account.routingNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={account.method} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.status} 
                      color={getStatusColor(account.status) as any}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.unitStatus} 
                      color={getStatusColor(account.unitStatus) as any}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {account.isPrimary && (
                      <Chip label="Primary" color="primary" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(account.createdTime).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" title="View Details">
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" title="Edit Account">
                        <Edit />
                      </IconButton>
                    </Box>
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

        {filteredAccounts.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No bank accounts found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try adjusting your search criteria' : 'No users have added bank accounts yet'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
