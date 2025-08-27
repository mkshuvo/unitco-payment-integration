'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Add, Edit, Delete, Star, StarBorder } from '@mui/icons-material';
import { getCurrentUser, hasRole, User } from '../../../lib/auth';

interface BankAccount {
  id: number;
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
}

export default function BankAccountsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountNumber: '',
    routingNumber: '',
    holderName: '',
    address1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    method: 'ACH' as 'ACH' | 'WIRE',
    currency: 'USD',
    makePrimary: false,
  });
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);

        // Load bank accounts
        const response = await fetch('/api/bank/accounts', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
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
  }, [router]);

  const handleAddAccount = async () => {
    try {
      const response = await fetch('/api/bank/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newAccount),
      });

      if (response.ok) {
        const account = await response.json();
        setAccounts([...accounts, account]);
        setAddDialogOpen(false);
        setNewAccount({
          accountNumber: '',
          routingNumber: '',
          holderName: '',
          address1: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
          method: 'ACH',
          currency: 'USD',
          makePrimary: false,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add bank account');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetPrimary = async (accountId: number) => {
    try {
      const response = await fetch(`/api/bank/accounts/${accountId}/primary`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (response.ok) {
        setAccounts(accounts.map(acc => ({
          ...acc,
          isPrimary: acc.id === accountId
        })));
      } else {
        setError('Failed to set primary account');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (accountId: number) => {
    try {
      const response = await fetch(`/api/bank/accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setAccounts(accounts.filter(acc => acc.id !== accountId));
      } else {
        setError('Failed to deactivate account');
      }
    } catch (err: any) {
      setError(err.message);
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

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Bank Accounts
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Account
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2 }}>
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">
                        {account.holderName}
                      </Typography>
                      {account.isPrimary && (
                        <Chip label="Primary" color="primary" size="small" />
                      )}
                      <Chip 
                        label={account.status} 
                        color={account.status === 'ACTIVE' ? 'success' : 'default'} 
                        size="small" 
                      />
                      <Chip 
                        label={`Unit: ${account.unitStatus}`} 
                        color={account.unitStatus === 'ACTIVE' ? 'success' : 'warning'} 
                        size="small" 
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {account.bankName} • ****{account.accountNumber.slice(-4)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Routing: {account.routingNumber} • {account.method} • {account.currency}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Added: {new Date(account.createdTime).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!account.isPrimary && (
                      <IconButton
                        onClick={() => handleSetPrimary(account.id)}
                        title="Set as primary"
                      >
                        <StarBorder />
                      </IconButton>
                    )}
                    {account.isPrimary && (
                      <IconButton disabled title="Primary account">
                        <Star color="primary" />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => handleDeactivate(account.id)}
                      title="Deactivate account"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          {accounts.length === 0 && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No bank accounts found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add your first bank account to start making payments
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Add Bank Account
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Add Account Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Bank Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              label="Account Holder Name"
              value={newAccount.holderName}
              onChange={(e) => setNewAccount({ ...newAccount, holderName: e.target.value })}
              required
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Account Number"
                value={newAccount.accountNumber}
                onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                required
              />
              <TextField
                label="Routing Number"
                value={newAccount.routingNumber}
                onChange={(e) => setNewAccount({ ...newAccount, routingNumber: e.target.value })}
                required
              />
            </Box>
            <TextField
              label="Address Line 1"
              value={newAccount.address1}
              onChange={(e) => setNewAccount({ ...newAccount, address1: e.target.value })}
              required
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                label="City"
                value={newAccount.city}
                onChange={(e) => setNewAccount({ ...newAccount, city: e.target.value })}
                required
              />
              <TextField
                label="State"
                value={newAccount.state}
                onChange={(e) => setNewAccount({ ...newAccount, state: e.target.value })}
                required
              />
              <TextField
                label="ZIP Code"
                value={newAccount.zip}
                onChange={(e) => setNewAccount({ ...newAccount, zip: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl>
                <InputLabel>Method</InputLabel>
                <Select
                  value={newAccount.method}
                  onChange={(e) => setNewAccount({ ...newAccount, method: e.target.value as 'ACH' | 'WIRE' })}
                >
                  <MenuItem value="ACH">ACH</MenuItem>
                  <MenuItem value="WIRE">Wire Transfer</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                >
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddAccount} variant="contained">
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
