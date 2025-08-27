'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Pagination,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { getCurrentUser, type User } from '@/lib/auth';
import {
  createPayment,
  getPayments,
  getBankAccounts,
  type CreatePaymentRequest,
  type PaymentView,
  type BankAccountView,
  type PaymentsResponse,
} from '@/lib/api';

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentView[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentView | null>(null);
  const [createForm, setCreateForm] = useState({
    amount: '',
    description: '',
    recipientName: '',
    recipientAccountNumber: '',
    recipientRoutingNumber: '',
    recipientAccountId: '',
  });
  const itemsPerPage = 10;
  const router = useRouter();

  const loadPayments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response: PaymentsResponse = await getPayments({ page, limit: itemsPerPage });
      setPayments(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [user, page, itemsPerPage]);

  const loadBankAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const accounts = await getBankAccounts();
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    }
  }, [user]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (err: any) {
        setError(err.message);
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const handleCreatePayment = async () => {
    setError('');
    setSuccess('');
    
    try {
      const paymentData: CreatePaymentRequest = {
        amount: parseFloat(createForm.amount),
        description: createForm.description,
        recipientName: createForm.recipientName,
        recipientAccountNumber: createForm.recipientAccountNumber,
        recipientRoutingNumber: createForm.recipientRoutingNumber,
        recipientAccountId: createForm.recipientAccountId ? parseInt(createForm.recipientAccountId) : undefined,
      };
      
      await createPayment(paymentData);
      setSuccess('Payment created successfully');
      setCreateDialogOpen(false);
      setCreateForm({
        amount: '',
        description: '',
        recipientName: '',
        recipientAccountNumber: '',
        recipientRoutingNumber: '',
        recipientAccountId: '',
      });
      loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (authLoading) {
    return (
      <Container>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Please log in to access payments.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">
            Payments
          </Typography>
          <Stack direction="row" spacing={2}>
            <IconButton onClick={loadPayments} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Payment
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Counterparty</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.id}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>{payment.recipientName || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            color={
                              payment.status === 'SENT'
                                ? 'success'
                                : payment.status === 'PENDING' || payment.status === 'PROCESSING'
                                ? 'warning'
                                : payment.status === 'REJECTED' || payment.status === 'RETURNED'
                                ? 'error'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setViewDialogOpen(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Create Payment Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Payment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Amount"
                type="number"
                value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Recipient Name"
                value={createForm.recipientName}
                onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Recipient Account Number"
                value={createForm.recipientAccountNumber}
                onChange={(e) => setCreateForm({ ...createForm, recipientAccountNumber: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Recipient Routing Number"
                value={createForm.recipientRoutingNumber}
                onChange={(e) => setCreateForm({ ...createForm, recipientRoutingNumber: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Source Bank Account (Optional)</InputLabel>
                <Select
                  value={createForm.recipientAccountId}
                  onChange={(e) => setCreateForm({ ...createForm, recipientAccountId: e.target.value })}
                  label="Source Bank Account (Optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  {bankAccounts.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId.toString()}>
                      {account.mask} - {account.bankName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePayment} variant="contained">
              Create Payment
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="ID" value={selectedPayment.id} InputProps={{ readOnly: true }} />
                <TextField label="Amount" value={`$${selectedPayment.amount.toFixed(2)}`} InputProps={{ readOnly: true }} />
                <TextField label="Description" value={selectedPayment.description} InputProps={{ readOnly: true }} />
                <TextField label="Recipient" value={selectedPayment.recipientName || 'N/A'} InputProps={{ readOnly: true }} />
                <TextField label="Status" value={selectedPayment.status} InputProps={{ readOnly: true }} />
                <TextField label="Created" value={new Date(selectedPayment.createdAt).toLocaleString()} InputProps={{ readOnly: true }} />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
