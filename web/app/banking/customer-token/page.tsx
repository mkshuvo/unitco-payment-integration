"use client";
import * as React from "react";
import Script from "next/script";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UnitWhiteLabel from "@/components/UnitWhiteLabel";
import { getUnitScriptSrc, getThemeUrl, getLanguageUrl } from "@/lib/unit";
import {
  resolveUnitCustomer,
  createUnitCustomerTokenVerification,
  createUnitCustomerToken,
} from "@/lib/api";

export default function CustomerTokenBankingPage() {
  const unitSrc = getUnitScriptSrc();
  const themeUrl = getThemeUrl();
  const languageUrl = getLanguageUrl();

  // Step 1: resolve by email (and optional userId)
  const [email, setEmail] = React.useState("");
  const [userId, setUserId] = React.useState<string>("");
  const [customerId, setCustomerId] = React.useState<string | null>(null);

  // Step 2: start verification
  const [channel, setChannel] = React.useState<"sms" | "call">("sms");
  const [countryCode, setCountryCode] = React.useState("+1");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [locale, setLocale] = React.useState<string>("");
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null);

  // Step 3: complete verification -> customer token
  const [verificationCode, setVerificationCode] = React.useState("");
  const [customerToken, setCustomerToken] = React.useState<string | null>(null);
  const [expiresIn, setExpiresIn] = React.useState<number>(3600);

  // UI state
  const [scriptReady, setScriptReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const el = document.querySelector("unit-elements-white-label-app") as any;
    if (!el) return;
    const onLoad = (e: any) => {
      const err = e?.detail?.errors?.[0];
      if (err?.status === "401") setExpired(true);
    };
    el.addEventListener("unitOnLoad", onLoad);
    return () => el.removeEventListener("unitOnLoad", onLoad);
  }, [customerToken]);

  // Schedule a pre-expiry refresh ~60s before the token expires to avoid UI interruptions.
  React.useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    // If we have an active token and it's not flagged as expired, schedule a refresh
    if (customerToken && !expired) {
      const seconds = Math.max(60, Number(expiresIn) || 3600);
      const triggerInMs = Math.max(5_000, (seconds - 60) * 1000);
      refreshTimerRef.current = window.setTimeout(() => {
        onRefreshToken();
      }, triggerInMs);
    }
    // Cleanup on change/unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [customerToken, expiresIn, expired]);

  async function onResolve() {
    setError(null);
    setCustomerId(null);
    setVerificationToken(null);
    setCustomerToken(null);
    setExpired(false);
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    try {
      const res = await resolveUnitCustomer({
        email,
        userId: userId ? Number(userId) : undefined,
      });
      if (!res.customerId) {
        setError("No Unit customer found for this email");
      }
      setCustomerId(res.customerId);
    } catch (e: any) {
      setError(e?.message || "Failed to resolve customer");
    } finally {
      setLoading(false);
    }
  }

  async function onSendVerification() {
    if (!customerId) {
      setError("Resolve a customer first");
      return;
    }
    setError(null);
    setVerificationToken(null);
    setCustomerToken(null);
    setExpired(false);
    setLoading(true);
    try {
      const payload: any = { channel };
      const cc = countryCode.trim();
      const pn = phoneNumber.trim();
      if (pn) payload.phone = { countryCode: cc || "+1", number: pn };
      if (locale.trim()) payload.locale = locale.trim();
      const res = await createUnitCustomerTokenVerification(customerId, payload);
      setVerificationToken(res.verificationToken);
    } catch (e: any) {
      setError(e?.message || "Failed to start verification");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateToken() {
    if (!customerId || !verificationToken || !verificationCode) {
      setError("Verification token and code are required");
      return;
    }
    setError(null);
    setCustomerToken(null);
    setExpired(false);
    setLoading(true);
    try {
      const res = await createUnitCustomerToken(customerId, {
        scope: "customer:read accounts:read transactions:read",
        verificationToken,
        verificationCode,
        expiresIn,
      });
      setCustomerToken(res.token);
    } catch (e: any) {
      setError(e?.message || "Failed to create customer token");
    } finally {
      setLoading(false);
    }
  }

  // Attempt to refresh the customer token if we still have verification info.
  // If not, fall back to sending a new verification challenge.
  async function onRefreshToken() {
    if (!customerId) {
      setError("Resolve a customer first");
      return;
    }
    if (verificationToken && verificationCode) {
      setError(null);
      setRefreshing(true);
      setLoading(true);
      const attemptRefresh = async (retries: number) => {
        try {
          const res = await createUnitCustomerToken(customerId, {
            scope: "customer:read accounts:read transactions:read",
            verificationToken,
            verificationCode,
            expiresIn,
          });
          setCustomerToken(res.token);
          setExpired(false);
          setLoading(false);
          setRefreshing(false);
        } catch (e: any) {
          if (retries > 0) {
            // brief backoff then retry once
            setTimeout(() => attemptRefresh(retries - 1), 1000);
          } else {
            setError(e?.message || "Failed to refresh customer token");
            setLoading(false);
            setRefreshing(false);
          }
        }
      };
      attemptRefresh(1);
      return;
    }
    // No verification code available anymore; restart verification flow.
    await onSendVerification();
  }

  return (
    <>
      <Script src={unitSrc} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Banking (Customer Token Flow)
        </Typography>
        <Typography color="text.secondary" paragraph>
          Resolve a Unit customer by email, send a verification challenge, and issue a customer token to embed the White‑Label UI.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {expired && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={onRefreshToken} disabled={loading || refreshing}>
                  Refresh Token
                </Button>
                <Button size="small" onClick={onSendVerification} disabled={loading}>
                  Send Code Again
                </Button>
              </Stack>
            }
          >
            Customer token expired or invalid (401). Re‑create a token.
          </Alert>
        )}

        <Stack spacing={3}>
          {/* Step 1: Resolve */}
          <Box>
            <Typography variant="h6" gutterBottom>1) Resolve Customer</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Customer Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              <TextField label="User ID (optional)" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))} sx={{ width: 200 }} />
              <Button variant="contained" onClick={onResolve} disabled={loading}>Resolve</Button>
            </Stack>
            {customerId && (
              <FormHelperText sx={{ mt: 1 }}>Resolved customerId: {customerId}</FormHelperText>
            )}
          </Box>

          {/* Step 2: Verification */}
          <Box>
            <Typography variant="h6" gutterBottom>2) Send Verification</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="channel">Channel</InputLabel>
                <Select labelId="channel" label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="call">Call</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Country Code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} sx={{ width: 160 }} />
              <TextField label="Phone (optional)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))} sx={{ width: 220 }} />
              <TextField label="Locale (optional)" value={locale} onChange={(e) => setLocale(e.target.value)} sx={{ width: 180 }} />
              <Button variant="contained" onClick={onSendVerification} disabled={loading || !customerId}>Send Code</Button>
            </Stack>
            {verificationToken && (
              <FormHelperText sx={{ mt: 1 }}>Verification token issued</FormHelperText>
            )}
          </Box>

          {/* Step 3: Create Customer Token */}
          <Box>
            <Typography variant="h6" gutterBottom>3) Create Customer Token</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Verification Code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.trim())} sx={{ width: 240 }} />
              <TextField label="Expires In (seconds)" type="number" value={String(expiresIn)} onChange={(e) => setExpiresIn(Math.max(60, Math.min(86400, Number(e.target.value) || 3600)))} sx={{ width: 220 }} />
              <Button variant="contained" onClick={onCreateToken} disabled={loading || !verificationToken || !verificationCode}>Create Token</Button>
            </Stack>
          </Box>

          {/* Step 4: Embed UI */}
          <Box>
            <Typography variant="h6" gutterBottom>4) Embedded UI</Typography>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
              {scriptReady && customerToken ? (
                <UnitWhiteLabel customerToken={customerToken} theme={themeUrl} language={languageUrl} />
              ) : (
                <FormHelperText>Waiting for script or customer token…</FormHelperText>
              )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </>
  );
}
