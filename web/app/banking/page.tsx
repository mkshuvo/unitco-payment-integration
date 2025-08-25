"use client";
import * as React from 'react';
import Script from 'next/script';
import { Box, Container, Alert, Stack, TextField, Button, Typography } from '@mui/material';
import UnitWhiteLabel from '@/components/UnitWhiteLabel';

import { getUnitScriptSrc, getEnvJwt, getStoredJwt, setStoredJwt, clearUnitStorage, getThemeUrl, getLanguageUrl } from '@/lib/unit';
const unitSrc = getUnitScriptSrc();

export default function BankingPage() {
  const [jwt, setJwt] = React.useState<string>(getEnvJwt());
  const [expired, setExpired] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const stored = getStoredJwt();
    if (stored) setJwt(stored);
  }, []);

  React.useEffect(() => {
    const el = document.querySelector('unit-elements-white-label-app') as any;
    if (!el) return;
    const onLoad = (e: any) => {
      setReady(true);
      const err = e?.detail?.errors?.[0];
      if (err?.status === '401') setExpired(true);
    };
    el.addEventListener('unitOnLoad', onLoad);
    return () => el.removeEventListener('unitOnLoad', onLoad);
  }, [jwt, ready]);

  const applyJwt = () => {
    const val = inputRef.current?.value?.trim();
    if (val) {
      setStoredJwt(val);
      setExpired(false);
      setJwt(val);
    }
  };

  // Optional customization URLs per Unit docs
  const themeUrl = getThemeUrl();
  const languageUrl = getLanguageUrl();

  return (
    <>
      <Script src={unitSrc} strategy="afterInteractive" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Banking</Typography>
        <Typography color="text.secondary" paragraph>
          Embedded Unit Ready‑to‑Launch experience. In Sandbox you can use the demo token or paste your own JWT.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <TextField inputRef={inputRef} label="JWT token" fullWidth placeholder="demo.jwt.token or your JWT" defaultValue={jwt} />
          <Button variant="contained" onClick={applyJwt}>Use Token</Button>
          <Button variant="text" onClick={clearUnitStorage}>Clear Unit Storage</Button>
        </Stack>
        {expired && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Token expired or invalid (401). Please refresh your JWT and click "Use Token".
          </Alert>
        )}
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <UnitWhiteLabel jwtToken={jwt} theme={themeUrl} language={languageUrl} />
        </Box>
      </Container>
    </>
  );
}
