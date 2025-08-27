/**
 * API client for connecting to the NestJS backend
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:41873';

export interface AddAchBankRequest {
  holderName: string;
  accountType: 'checking' | 'savings';
  routingNumber: string;
  accountNumber: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  makePrimary?: boolean;
  sameDayEligible?: boolean;
}

export interface BankAccountView {
  accountId: number;
  bankName: string;
  mask: string;
  method: 'ACH' | 'WIRE';
  country: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  unitCounterpartyStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdTime: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Masks sensitive data for logging
 */
function maskSensitiveData(data: string, type: 'account' | 'routing' | 'name'): string {
  switch (type) {
    case 'account':
      return data.length >= 4 ? `****${data.slice(-4)}` : '****';
    case 'routing':
      return data.length >= 4 ? `${data.slice(0, 4)}****${data.slice(-1)}` : '****';
    case 'name':
      if (data.length <= 2) return '**';
      return `${data.slice(0, 1)}${'*'.repeat(data.length - 2)}${data.slice(-1)}`;
    default:
      return '****';
  }
}

/**
 * Adds a US ACH bank account
 */
export async function addAchBankAccount(data: AddAchBankRequest): Promise<BankAccountView> {
  const url = `${API_BASE_URL}/providers/me/bank-accounts/ach`;
  
  // Log request with sensitive data redacted
  console.log('Adding ACH bank account:', {
    holderName: maskSensitiveData(data.holderName, 'name'),
    routingNumber: maskSensitiveData(data.routingNumber, 'routing'),
    accountNumber: maskSensitiveData(data.accountNumber, 'account'),
    accountType: data.accountType,
    city: data.city,
    state: data.state,
    zip: data.zip,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Log success with masked data
    console.log('Successfully added bank account:', {
      accountId: result.accountId,
      mask: result.mask,
      bankName: result.bankName,
      unitCounterpartyStatus: result.unitCounterpartyStatus,
    });

    return result;
  } catch (error) {
    console.error('Failed to add bank account:', error);
    throw error;
  }
}

/**
 * Gets list of bank accounts for the current user
 */
export async function getBankAccounts(): Promise<BankAccountView[]> {
  const url = `${API_BASE_URL}/providers/me/bank-accounts`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get bank accounts:', error);
    throw error;
  }
}

export interface UnitStatusView {
  status: 'UP' | 'DOWN';
  checkedAt: string;
  responseTimeMs: number;
  target: string;
  reason?: string;
}

export async function getIntegrationStatus(): Promise<UnitStatusView> {
  const url = `${API_BASE_URL}/integration/unit/status`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Status check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  fullName?: string;
}

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const url = `${API_BASE_URL}/auth/register`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ===== Unit Integration Client =====

export interface ResolveCustomerRequest {
  email: string;
  userId?: number;
}

export interface ResolveCustomerResponse {
  email: string;
  customerId: string | null;
  persisted: boolean;
}

export async function resolveUnitCustomer(
  data: ResolveCustomerRequest,
): Promise<ResolveCustomerResponse> {
  const url = `${API_BASE_URL}/integration/unit/customers/resolve`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export interface CreateTokenVerificationRequest {
  channel: 'sms' | 'call';
  phone?: { countryCode: string; number: string };
  locale?: string;
}

export interface CreateTokenVerificationResponse {
  verificationToken: string;
}

export async function createUnitCustomerTokenVerification(
  customerId: string,
  data: CreateTokenVerificationRequest,
): Promise<CreateTokenVerificationResponse> {
  const url = `${API_BASE_URL}/integration/unit/customers/${encodeURIComponent(customerId)}/token/verification`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export interface CreateCustomerTokenRequest {
  scope: string;
  verificationToken?: string;
  verificationCode?: string;
  jwtToken?: string;
  expiresIn?: number;
}

export interface CreateCustomerTokenResponse {
  token: string;
  expiresIn: number;
}

export async function createUnitCustomerToken(
  customerId: string,
  data: CreateCustomerTokenRequest,
): Promise<CreateCustomerTokenResponse> {
  const url = `${API_BASE_URL}/integration/unit/customers/${encodeURIComponent(customerId)}/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ===== Admin API Functions =====

export interface AdminBankAccountView extends BankAccountView {
  userId: number;
  userEmail: string;
  userFullName?: string;
}

export interface AdminBankAccountsResponse {
  data: AdminBankAccountView[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminBankAccounts(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminBankAccountsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);

  const url = `${API_BASE_URL}/admin/bank-accounts?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export interface AdminUserView {
  id: number;
  email: string;
  fullName?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminUsersResponse {
  data: AdminUserView[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);

  const url = `${API_BASE_URL}/admin/users?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export interface UpdateUserRoleRequest {
  userId: number;
  roles: string[];
}

export async function updateUserRoles(data: UpdateUserRoleRequest): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/admin/users/${data.userId}/roles`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roles: data.roles }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== Bank Account Management =====

export async function setPrimaryBankAccount(accountId: number): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/providers/me/bank-accounts/${accountId}/primary`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function deactivateBankAccount(accountId: number): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/providers/me/bank-accounts/${accountId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== Payment Management =====

export interface CreatePaymentRequest {
  amount: number;
  description: string;
  recipientAccountId?: number;
  recipientEmail?: string;
  recipientName?: string;
  recipientRoutingNumber?: string;
  recipientAccountNumber?: string;
  sameDay?: boolean;
}

export interface PaymentView {
  id: number;
  amount: number;
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'RETURNED' | 'REJECTED';
  direction: 'CREDIT' | 'DEBIT';
  recipientName?: string;
  recipientEmail?: string;
  createdAt: string;
  processedAt?: string;
  unitPaymentId?: string;
  unitStatus?: string;
}

export interface PaymentsResponse {
  data: PaymentView[];
  total: number;
  page: number;
  limit: number;
}

export async function createPayment(data: CreatePaymentRequest): Promise<PaymentView> {
  const url = `${API_BASE_URL}/payments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function getPayments(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaymentsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);

  const url = `${API_BASE_URL}/payments?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function getPaymentById(paymentId: number): Promise<PaymentView> {
  const url = `${API_BASE_URL}/payments/${paymentId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== Admin Payment Management =====

export interface AdminPaymentView extends PaymentView {
  userId: number;
  userEmail: string;
  userFullName?: string;
}

export interface AdminPaymentsResponse {
  data: AdminPaymentView[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminPayments(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<AdminPaymentsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);

  const url = `${API_BASE_URL}/admin/payments?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function approvePayment(paymentId: number): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/admin/payments/${paymentId}/approve`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function rejectPayment(paymentId: number, reason?: string): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/admin/payments/${paymentId}/reject`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
