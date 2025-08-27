"use client";
import * as React from 'react';
import Script from 'next/script';
import {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from '@mui/material';
import { API_BASE_URL } from '@/lib/api';
import { getCurrentUser, type User } from '@/lib/auth';

interface ApplicationFormResponse {
  id: string;
  applicationFormToken: {
    token: string;
    expiration: string;
  };
  links?: {
    related?: string;
  };
}

export default function UnitApplicationFormPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [applicationForm, setApplicationForm] = React.useState<ApplicationFormResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [formCompleted, setFormCompleted] = React.useState(false);

  const unitScriptSrc = 'https://ui.s.unit.sh/release/latest/components-extended.js';
  const themeUrl = process.env.NEXT_PUBLIC_UNIT_THEME_URL;
  const languageUrl = process.env.NEXT_PUBLIC_UNIT_LANGUAGE_URL;

  // Load user on component mount
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const createApplicationForm = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/integration/unit/application-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tags: {
            userId: user?.id?.toString(),
            email: user?.email,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setApplicationForm(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application form');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (user && !applicationForm && !isLoading) {
      createApplicationForm();
    }
  }, [user, applicationForm, isLoading]);

  React.useEffect(() => {
    if (scriptLoaded && applicationForm) {
      const element = document.querySelector('unit-elements-application-form') as any;
      if (element) {
        // Listen for application form events
        const onLoad = (e: any) => {
          console.log('Application form loaded:', e.detail);
        };

        const onSubmit = (e: any) => {
          console.log('Application form submitted:', e.detail);
          setFormCompleted(true);
        };

        const onError = (e: any) => {
          console.error('Application form error:', e.detail);
          const errorDetail = e.detail?.errors?.[0];
          if (errorDetail?.status === '401' || errorDetail?.title?.includes('expired')) {
            setError('Application form token expired. Please refresh the page.');
          } else {
            setError(errorDetail?.detail || 'An error occurred with the application form');
          }
        };

        element.addEventListener('unitOnLoad', onLoad);
        element.addEventListener('unitOnSubmit', onSubmit);
        element.addEventListener('unitOnError', onError);

        return () => {
          element.removeEventListener('unitOnLoad', onLoad);
          element.removeEventListener('unitOnSubmit', onSubmit);
          element.removeEventListener('unitOnError', onError);
        };
      }
    }
  }, [scriptLoaded, applicationForm]);

  const handleRefresh = () => {
    setApplicationForm(null);
    setError(null);
    setFormCompleted(false);
    createApplicationForm();
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please log in to access the Unit application form.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Script 
        src={unitScriptSrc} 
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError('Failed to load Unit components script')}
      />
      
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Unit Account Application
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Complete your Unit account application to access banking services. This form is provided by Unit
          and will collect the necessary information for account verification and setup.
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {formCompleted && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Application submitted successfully! You will be notified once your account is approved.
          </Alert>
        )}

        {isLoading && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={24} />
                <Typography>Creating application form...</Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {applicationForm && scriptLoaded && !formCompleted && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Application Form
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please fill out all required information accurately. This information will be used
                for identity verification and account setup.
              </Typography>

              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                p: 1,
                minHeight: '600px',
              }}>
                <unit-elements-application-form
                  application-form-id={applicationForm.id}
                  application-form-token={applicationForm.applicationFormToken.token}
                  theme={themeUrl}
                  language={languageUrl}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {!applicationForm && !isLoading && !error && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ready to Start?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click the button below to begin your Unit account application.
              </Typography>
              <Button variant="contained" onClick={createApplicationForm}>
                Start Application
              </Button>
            </CardContent>
          </Card>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            This application form is powered by Unit and operates in sandbox mode for testing purposes.
            No real financial accounts will be created.
          </Typography>
        </Box>
      </Container>
    </>
  );
}
