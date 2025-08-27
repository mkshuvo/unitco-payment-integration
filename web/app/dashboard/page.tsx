'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import Link from 'next/link';
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
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Banking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage bank accounts and view Unit white-label banking interface
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                component={Link}
                href="/banking"
                sx={{ ml: 'auto' }}
              >
                Open Banking
              </Button>
            </CardActions>
          </Card>

          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <PaymentIcon sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Payments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send payments, view transaction history, and manage payment recipients
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                component={Link}
                href="/payments"
                sx={{ ml: 'auto' }}
              >
                View Payments
              </Button>
            </CardActions>
          </Card>

          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <AdminIcon sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Unit Onboarding
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete your Unit account application for banking services
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                component={Link}
                href="/onboarding/unit-application"
                sx={{ ml: 'auto' }}
              >
                Start Application
              </Button>
            </CardActions>
          </Card>

          {hasRole(user, 'ADMIN') && (
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <AdminIcon sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Admin Panel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage users, roles, banking accounts, and system settings
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  component={Link}
                  href="/admin/users"
                  sx={{ mr: 1 }}
                >
                  Users
                </Button>
                <Button
                  size="small"
                  component={Link}
                  href="/admin/banking"
                  sx={{ mr: 1 }}
                >
                  Banking
                </Button>
                <Button
                  size="small"
                  component={Link}
                  href="/admin/payments"
                >
                  Payments
                </Button>
              </CardActions>
            </Card>
          )}
        </Box>
      </Box>
    </Container>
  );
}
