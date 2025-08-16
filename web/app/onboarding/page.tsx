"use client";
import * as React from "react";
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
import { isValidUsRouting, last4Mask } from "@/lib/validators";
import { addAchBankAccount, BankAccountView } from "@/lib/api";

export default function OnboardingPage() {
  const [holderName, setHolderName] = React.useState("");
  const [routingNumber, setRoutingNumber] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountType, setAccountType] = React.useState<"checking" | "savings">(
    "checking"
  );
  const [address1, setAddress1] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [makePrimary, setMakePrimary] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMask, setSuccessMask] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const validRouting = routingNumber.length === 9 && isValidUsRouting(routingNumber);
  const validAcc = accountNumber.length >= 4 && accountNumber.length <= 17;
  const canSubmit =
    holderName && validRouting && validAcc && address1 && city && state && zip && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await addAchBankAccount({
        holderName,
        accountType,
        routingNumber,
        accountNumber,
        address1,
        address2,
        city,
        state,
        zip,
        makePrimary,
      });
      
      setSuccessMask(result.mask);
      // Reset sensitive fields
      setAccountNumber("");
      setRoutingNumber("");
    } catch (err: any) {
      setError(err?.message || "Failed to add bank account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom>
        Add US Bank Account (ACH)
      </Typography>
      <Typography color="text.secondary" paragraph>
        Your details are validated locally and securely submitted to our API.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMask && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Bank account ending {successMask} added (pending server integration)
        </Alert>
      )}

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            required
            label="Account holder name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
          />
          <TextField
            required
            label="Routing number"
            inputProps={{ inputMode: "numeric", pattern: "\\d*", maxLength: 9 }}
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ""))}
            error={routingNumber.length > 0 && !validRouting}
            helperText={
              routingNumber.length > 0 && !validRouting
                ? "Invalid US routing number"
                : "9 digits"
            }
          />
          <TextField
            required
            label="Account number"
            inputProps={{ inputMode: "numeric", pattern: "\\d*", maxLength: 17 }}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            error={accountNumber.length > 0 && !validAcc}
            helperText={
              accountNumber.length > 0 && !validAcc
                ? "Account number must be 4–17 digits"
                : "4–17 digits"
            }
          />
          <FormControl fullWidth>
            <InputLabel id="acct-type">Account type</InputLabel>
            <Select
              labelId="acct-type"
              value={accountType}
              label="Account type"
              onChange={(e) => setAccountType(e.target.value as any)}
            >
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
            </Select>
            <FormHelperText>Used for ACH SEC code selection</FormHelperText>
          </FormControl>
          <TextField required label="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField required label="City" sx={{ flex: 1 }} value={city} onChange={(e) => setCity(e.target.value)} />
            <TextField required label="State" sx={{ width: 120 }} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
            <TextField required label="ZIP" sx={{ width: 160 }} inputProps={{ maxLength: 10 }} value={zip} onChange={(e) => setZip(e.target.value)} />
          </Stack>
          <FormHelperText>Primary account will be used for weekly payouts</FormHelperText>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {submitting ? "Submitting..." : "Add Bank Account"}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
