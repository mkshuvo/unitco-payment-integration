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
  Grid,
  Alert,
} from '@mui/material';
import { getCurrentUser, logout, hasRole, User } from '../../lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

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
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
      // Force redirect even if logout fails
      router.push('/login');
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
    return null; // Will redirect to login
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Button variant="outlined" onClick={handleLogout}>
            Logout
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Welcome, {user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Roles: {user.roles.join(', ')}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Banking
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage your bank accounts and view transactions
              </Typography>
              <Button 
                variant="contained" 
                href="/banking"
                disabled={!hasRole(user, 'USER') && !hasRole(user, 'ADMIN')}
              >
                View Banking
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Generate and manage Unit customer tokens
              </Typography>
              <Button 
                variant="contained" 
                href="/banking/customer-token"
              >
                Manage Tokens
              </Button>
            </CardContent>
          </Card>

          {hasRole(user, 'ADMIN') && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Admin Panel
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Manage users, roles, and system settings
                </Typography>
                <Button variant="contained" href="/admin">
                  Admin Panel
                </Button>
              </CardContent>
            </Card>
          )}

          {(hasRole(user, 'ADMIN') || hasRole(user, 'ACCOUNTANT')) && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payments
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create and manage payments
                </Typography>
                <Button variant="contained" href="/payments">
                  Manage Payments
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Container>
  );
}
