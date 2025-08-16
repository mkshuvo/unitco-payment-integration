/**
 * API client for connecting to the NestJS backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:41873';

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
