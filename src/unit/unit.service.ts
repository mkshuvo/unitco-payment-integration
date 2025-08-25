import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Unit } from '@unit-finance/unit-node-sdk';

export interface CreateCounterpartyRequest {
  name: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'Checking' | 'Savings';
  type: 'Person' | 'Business';
  address?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone?: {
    countryCode: string;
    number: string;
  };
  dateOfBirth?: string; // YYYY-MM-DD for Person
  ein?: string; // For Business
  ssn?: string; // For Person
}

export interface CreateAchCreditRequest {
  accountId: string;
  counterpartyId: string;
  amount: number;
  description: string;
  addenda?: string;
  idempotencyKey: string;
  tags?: Record<string, string>;
}

@Injectable()
export class UnitService {
  private readonly logger = new Logger(UnitService.name);
  private readonly unitApi: any;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('UNIT_API_KEY');
    const baseUrl = this.config.get('UNIT_BASE_URL') || 'https://api.s.unit.sh';
    
    if (!apiKey) {
      throw new Error('UNIT_API_KEY environment variable is required');
    }

    this.unitApi = new Unit(apiKey, baseUrl);
  }

  async createCounterparty(data: CreateCounterpartyRequest): Promise<any> {
    try {
      this.logger.log(`Creating Unit counterparty for ${data.name}`);

      const counterpartyData = {
        type: 'achCounterparty',
        attributes: {
          name: data.name,
          routingNumber: data.routingNumber,
          accountNumber: data.accountNumber,
          accountType: data.accountType,
          type: data.type,
          ...(data.address && { address: data.address }),
          ...(data.phone && { phone: data.phone }),
          ...(data.dateOfBirth && { dateOfBirth: data.dateOfBirth }),
          ...(data.ein && { ein: data.ein }),
          ...(data.ssn && { ssn: data.ssn }),
        },
      };

      const response = await this.unitApi.counterparties.create(counterpartyData);
      
      this.logger.log(`Unit counterparty created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Unit counterparty', error);
      throw new Error(`Unit counterparty creation failed: ${error.message}`);
    }
  }

  async getCounterparty(counterpartyId: string): Promise<any> {
    try {
      const response = await this.unitApi.counterparties.get(counterpartyId);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get Unit counterparty ${counterpartyId}`, error);
      throw new Error(`Unit counterparty retrieval failed: ${error.message}`);
    }
  }

  async createAchCredit(data: CreateAchCreditRequest): Promise<any> {
    try {
      this.logger.log(`Creating ACH credit payment: ${data.idempotencyKey}`);

      const paymentData = {
        type: 'achPayment',
        attributes: {
          amount: Math.round(data.amount * 100), // Convert to cents
          direction: 'Credit',
          counterpartyId: data.counterpartyId,
          description: data.description,
          ...(data.addenda && { addenda: data.addenda }),
          ...(data.tags && { tags: data.tags }),
        },
        relationships: {
          account: {
            data: {
              type: 'account',
              id: data.accountId,
            },
          },
        },
      };

      const response = await this.unitApi.payments.create(paymentData, {
        'Idempotency-Key': data.idempotencyKey,
      });

      this.logger.log(`ACH credit payment created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create ACH credit payment', error);
      throw new Error(`ACH credit payment failed: ${error.message}`);
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await this.unitApi.payments.get(paymentId);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get payment ${paymentId}`, error);
      throw new Error(`Payment retrieval failed: ${error.message}`);
    }
  }

  async listPayments(options: {
    accountId?: string;
    customerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    try {
      const params: any = {};
      
      if (options.accountId) params['filter[accountId]'] = options.accountId;
      if (options.customerId) params['filter[customerId]'] = options.customerId;
      if (options.status) params['filter[status]'] = options.status;
      if (options.limit) params['page[limit]'] = options.limit;
      if (options.offset) params['page[offset]'] = options.offset;

      const response = await this.unitApi.payments.list(params);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list payments', error);
      throw new Error(`Payment listing failed: ${error.message}`);
    }
  }

  async validateRoutingNumber(routingNumber: string): Promise<boolean> {
    try {
      // Basic routing number validation
      if (!/^\d{9}$/.test(routingNumber)) {
        return false;
      }

      // Checksum validation using the standard algorithm
      const digits = routingNumber.split('').map(Number);
      const checksum = 
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        1 * (digits[2] + digits[5] + digits[8]);

      return checksum % 10 === 0;
    } catch (error) {
      this.logger.error('Routing number validation failed', error);
      return false;
    }
  }

  async getAccountBalance(accountId: string): Promise<any> {
    try {
      const response = await this.unitApi.accounts.get(accountId);
      return {
        available: response.data.attributes.balance,
        current: response.data.attributes.balance,
        currency: 'USD',
      };
    } catch (error) {
      this.logger.error(`Failed to get account balance for ${accountId}`, error);
      throw new Error(`Account balance retrieval failed: ${error.message}`);
    }
  }
}
