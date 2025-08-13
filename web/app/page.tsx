"use client";
import * as React from 'react';
import { AppBar, Box, Button, Container, Link as MLink, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Unit Payouts
          </Typography>
          <Button color="inherit" component={Link} href="/onboarding">Onboarding</Button>
          <Button color="inherit" component={Link} href="/accounts">Accounts</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom>
          Provider Payouts Platform
        </Typography>
        <Typography color="text.secondary" paragraph>
          Add and manage bank accounts, and receive payouts weekly.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button variant="contained" component={Link} href="/onboarding">Add US Bank Account</Button>
          <Button variant="outlined" component={Link} href="/accounts">Manage Accounts</Button>
        </Box>
        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Docs: <MLink href="/" component={Link}>Home</MLink>
          </Typography>
        </Box>
      </Container>
    </>
  );
}
