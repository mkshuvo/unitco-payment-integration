import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UnitService } from '../unit/unit.service';
import { BankAccount } from '../entities/bank-account.entity';
import { CryptoService } from '../crypto/crypto.service';
import * as crypto from 'crypto';

export interface CreatePaymentRequest {
  amount: number;
  bankAccountId?: number;
  notes?: string;
}

export interface PaymentView {
  id: string;
  amount: number;
  status: string;
  bankAccountId: number;
  unitPaymentId?: string;
  notes?: string;
  createdTime: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccounts: Repository<BankAccount>,
    private readonly unitService: UnitService,
    private readonly cryptoService: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async createPayment(
    userId: number,
    data: CreatePaymentRequest,
  ): Promise<PaymentView> {
    // Validate amount
    const maxAmount = Number(this.config.get('PAYMENT_LIMIT_SINGLE') || 10000);
    if (data.amount <= 0 || data.amount > maxAmount) {
      throw new BadRequestException(
        `Payment amount must be between $0.01 and $${maxAmount}`
      );
    }

    // Get bank account (primary if not specified)
    let bankAccount: BankAccount;
    if (data.bankAccountId) {
      bankAccount = await this.bankAccounts.findOne({
        where: { 
          account_id: data.bankAccountId, 
          user_id: userId,
          status: 'ACTIVE'
        },
      });
    } else {
      bankAccount = await this.bankAccounts.findOne({
        where: { 
          user_id: userId, 
          is_primary: 1,
          status: 'ACTIVE'
        },
      });
    }

    if (!bankAccount) {
      throw new BadRequestException('No active bank account found');
    }

    if (bankAccount.unit_counterparty_status !== 'ACTIVE') {
      throw new BadRequestException('Bank account is not validated with Unit');
    }

    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();

    try {
      // Create Unit ACH credit payment
      const unitPayment = await this.unitService.createAchCredit({
        accountId: this.config.get('UNIT_ACCOUNT_ID'), // Your Unit account ID
        counterpartyId: bankAccount.unit_counterparty_id!,
        amount: data.amount,
        description: `Payment to ${bankAccount.encrypted_account_holder_name}`,
        addenda: data.notes,
        idempotencyKey,
      });

      this.logger.log(`Created Unit payment: ${unitPayment.id}`);

      // Return payment view
      return {
        id: idempotencyKey,
        amount: data.amount,
        status: unitPayment.attributes.status,
        bankAccountId: bankAccount.account_id,
        unitPaymentId: unitPayment.id,
        notes: data.notes,
        createdTime: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to create payment', error);
      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  async getPayments(userId: number, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<PaymentView[]> {
    // This would typically query a payments table
    // For now, we'll return an empty array as the payment tracking
    // would be implemented with the pay_accounting_payment table
    return [];
  }

  async getPayment(userId: number, paymentId: string): Promise<PaymentView | null> {
    try {
      const unitPayment = await this.unitService.getPayment(paymentId);
      
      return {
        id: paymentId,
        amount: unitPayment.attributes.amount / 100, // Convert from cents
        status: unitPayment.attributes.status,
        bankAccountId: 0, // Would need to be tracked in database
        unitPaymentId: unitPayment.id,
        createdTime: new Date(unitPayment.attributes.createdAt),
      };
    } catch (error) {
      this.logger.error(`Failed to get payment ${paymentId}`, error);
      return null;
    }
  }
}
