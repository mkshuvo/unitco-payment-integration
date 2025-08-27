"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Pagination,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { getCurrentUser, hasRole, type User } from '@/lib/auth';
import {
  getAdminPayments,
  approvePayment,
  rejectPayment,
  type AdminPaymentView,
  type AdminPaymentsResponse,
} from '@/lib/api';

export default function AdminPaymentsPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<AdminPaymentView[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const router = useRouter();

  // Action dialogs
  const [actionDialog, setActionDialog] = React.useState<{
    open: boolean;
    type: 'approve' | 'reject';
    payment: AdminPaymentView | null;
    reason?: string;
  }>({
    open: false,
    type: 'approve',
    payment: null,
    reason: '',
  });

  // Load user on mount
  React.useEffect(() => {
    const loadUser = async () => {
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
      } catch (err: any) {
        setError(err.message);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const loadPayments = React.useCallback(async () => {
    if (!user || !hasRole(user, 'ADMIN')) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response: AdminPaymentsResponse = await getAdminPayments({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setPayments(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [user, page, limit, search, statusFilter]);

  React.useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleApprovePayment = async () => {
    if (!actionDialog.payment) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      await approvePayment(actionDialog.payment.id);
      setSuccess(`Payment #${actionDialog.payment.id} approved successfully`);
      setActionDialog({ open: false, type: 'approve', payment: null });
      loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async () => {
    if (!actionDialog.payment) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      await rejectPayment(actionDialog.payment.id, actionDialog.reason);
      setSuccess(`Payment #${actionDialog.payment.id} rejected successfully`);
      setActionDialog({ open: false, type: 'reject', payment: null, reason: '' });
      loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'success';
      case 'PROCESSING': return 'info';
      case 'PENDING': return 'warning';
      case 'RETURNED': case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Container><Typography>Loading...</Typography></Container>;
  }

  if (!user || !user.roles.includes('ADMIN')) {
    return (
      <Container>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payment Management</Typography>
        <IconButton onClick={loadPayments} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              placeholder="Search by user, description, or recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="RETURNED">Returned</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">
                        {isLoading ? 'Loading payments...' : 'No payments found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>#{payment.id}</TableCell>
                      <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {payment.userFullName || payment.userEmail}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.userEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>
                        {payment.recipientName || payment.recipientEmail || 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={payment.direction === 'DEBIT' ? 'error' : 'success'}
                          fontWeight="medium"
                        >
                          {payment.direction === 'DEBIT' ? '-' : '+'}
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          color={getStatusColor(payment.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {payment.status === 'PENDING' && (
                            <>
                              <Tooltip title="Approve Payment">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      type: 'approve',
                                      payment,
                                    })
                                  }
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Reject Payment">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      type: 'reject',
                                      payment,
                                      reason: '',
                                    })
                                  }
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: 'approve', payment: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'approve' ? 'Approve Payment' : 'Reject Payment'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.payment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Payment #{actionDialog.payment.id}
              </Typography>
              <Typography variant="h6">
                {formatCurrency(actionDialog.payment.amount)}
              </Typography>
              <Typography variant="body2">
                {actionDialog.payment.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                To: {actionDialog.payment.recipientName || actionDialog.payment.recipientEmail}
              </Typography>
            </Box>
          )}
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            {actionDialog.type === 'approve'
              ? 'Are you sure you want to approve this payment? This action cannot be undone.'
              : 'Are you sure you want to reject this payment? Please provide a reason.'}
          </Typography>

          {actionDialog.type === 'reject' && (
            <TextField
              label="Rejection Reason"
              multiline
              rows={3}
              value={actionDialog.reason}
              onChange={(e) =>
                setActionDialog({ ...actionDialog, reason: e.target.value })
              }
              fullWidth
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setActionDialog({ open: false, type: 'approve', payment: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={actionDialog.type === 'approve' ? handleApprovePayment : handleRejectPayment}
            variant="contained"
            color={actionDialog.type === 'approve' ? 'success' : 'error'}
            disabled={actionDialog.type === 'reject' && !actionDialog.reason?.trim()}
          >
            {actionDialog.type === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
