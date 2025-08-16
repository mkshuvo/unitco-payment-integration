import { Injectable, Logger } from '@nestjs/common';
import { BankAccountRepository } from '../repositories/bank-account.repository';
import { PayoutBatchRepository } from '../repositories/payout-batch.repository';
import { PayoutItemRepository } from '../repositories/payout-item.repository';
import { CreatePayoutBatchDto } from './dto/create-payout-batch.dto';
import { PayoutBatchView } from './dto/payout-batch-view.dto';
import { PayoutPreviewDto } from './dto/payout-preview.dto';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private bankAccountRepository: BankAccountRepository,
    private payoutBatchRepository: PayoutBatchRepository,
    private payoutItemRepository: PayoutItemRepository,
  ) {}

  /**
   * Compute payout preview for a given date range
   */
  async computePayoutPreview(
    startDate: Date,
    endDate: Date,
    userId: number,
  ): Promise<PayoutPreviewDto> {
    this.logger.log(`Computing payout preview for user ${userId} from ${startDate} to ${endDate}`);

    // Get user's primary bank account
    const primaryAccount = await this.bankAccountRepository.findPrimaryByUser(userId);
    if (!primaryAccount) {
      throw new Error('No primary bank account found for user');
    }

    // Mock computation - in real app this would query actual earnings data
    const mockEarnings = await this.getMockEarningsForPeriod(startDate, endDate, userId);
    
    const totalAmount = mockEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    const itemCount = mockEarnings.length;

    return {
      startDate,
      endDate,
      totalAmount,
      itemCount,
      currency: 'USD',
      estimatedDeliveryDate: this.calculateEstimatedDeliveryDate(endDate),
      bankAccount: {
        accountId: primaryAccount.account_id,
        bankName: primaryAccount.branch?.bank_name || 'Unknown Bank',
        mask: primaryAccount.mask || '****',
        method: primaryAccount.method,
      },
    };
  }

  /**
   * Create a payout batch with idempotent keying
   */
  async createPayoutBatch(
    dto: CreatePayoutBatchDto,
    userId: number,
  ): Promise<PayoutBatchView> {
    this.logger.log(`Creating payout batch for user ${userId}`, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      idempotencyKey: dto.idempotencyKey,
    });

    // Check for existing batch with same idempotency key
    const existingBatch = await this.payoutBatchRepository.findByUserAndKey(
      userId,
      dto.idempotencyKey,
    );

    if (existingBatch) {
      this.logger.log(`Found existing batch ${existingBatch.batch_id} for idempotency key`);
      return this.toPayoutBatchView(existingBatch);
    }

    // Get user's primary bank account
    const primaryAccount = await this.bankAccountRepository.findPrimaryByUser(userId);
    if (!primaryAccount) {
      throw new Error('No primary bank account found for user');
    }

    // Compute payout items
    const earnings = await this.getMockEarningsForPeriod(dto.startDate, dto.endDate, userId);
    
    // Create batch
    const batch = await this.payoutBatchRepository.createBatch({
      userId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalAmount: earnings.reduce((sum, earning) => sum + earning.amount, 0),
      itemCount: earnings.length,
      currency: 'USD',
      idempotencyKey: dto.idempotencyKey,
      status: 'PENDING',
    });

    // Create payout items
    const payoutItems = await Promise.all(
      earnings.map(earning =>
        this.payoutItemRepository.createItem({
          batchId: batch.batch_id,
          userId,
          amount: earning.amount,
          currency: 'USD',
          description: earning.description,
          referenceId: earning.referenceId,
          status: 'PENDING',
        })
      )
    );

    this.logger.log(`Created payout batch ${batch.batch_id} with ${payoutItems.length} items`);

    return this.toPayoutBatchView(batch);
  }

  /**
   * Submit payout batch to Unit API
   */
  async submitPayoutBatch(batchId: number, userId: number): Promise<void> {
    this.logger.log(`Submitting payout batch ${batchId} for user ${userId}`);

    const batch = await this.payoutBatchRepository.findById(batchId);
    if (!batch || batch.user_id !== userId) {
      throw new Error('Payout batch not found');
    }

    if (batch.status !== 'PENDING') {
      throw new Error(`Cannot submit batch in status: ${batch.status}`);
    }

    // Get payout items
    const items = await this.payoutItemRepository.findByBatchId(batchId);
    
    // Get user's primary bank account
    const primaryAccount = await this.bankAccountRepository.findPrimaryByUser(userId);
    if (!primaryAccount) {
      throw new Error('No primary bank account found for user');
    }

    // Mock Unit API submission
    try {
      await this.submitToUnitApi(batch, items, primaryAccount);
      
      // Update batch status
      await this.payoutBatchRepository.updateStatus(batchId, 'SUBMITTED', userId);
      await this.payoutItemRepository.updateStatusByBatchId(batchId, 'SUBMITTED');
      
      this.logger.log(`Successfully submitted payout batch ${batchId} to Unit API`);
    } catch (error) {
      // Update batch status to failed
      await this.payoutBatchRepository.updateStatus(batchId, 'FAILED', userId);
      await this.payoutItemRepository.updateStatusByBatchId(batchId, 'FAILED');
      
      this.logger.error(`Failed to submit payout batch ${batchId}`, error);
      throw error;
    }
  }

  /**
   * Get payout batches for a user
   */
  async getPayoutBatches(userId: number): Promise<PayoutBatchView[]> {
    const batches = await this.payoutBatchRepository.findByUser(userId);
    return batches.map(batch => this.toPayoutBatchView(batch));
  }

  /**
   * Mock earnings data for testing
   */
  private async getMockEarningsForPeriod(
    startDate: Date,
    endDate: Date,
    userId: number,
  ): Promise<Array<{ amount: number; description: string; referenceId: string }>> {
    // Mock implementation - in real app this would query actual earnings data
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const mockEarnings = [];

    for (let i = 0; i < Math.min(daysDiff, 7); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      mockEarnings.push({
        amount: Math.floor(Math.random() * 1000) + 100, // $100-$1100
        description: `Earnings for ${date.toISOString().split('T')[0]}`,
        referenceId: `earn_${userId}_${date.getTime()}`,
      });
    }

    return mockEarnings;
  }

  /**
   * Calculate estimated delivery date (next business day after batch date)
   */
  private calculateEstimatedDeliveryDate(batchDate: Date): Date {
    const deliveryDate = new Date(batchDate);
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    
    // Skip weekends
    while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
    
    return deliveryDate;
  }

  /**
   * Mock Unit API submission
   */
  private async submitToUnitApi(
    batch: any,
    items: any[],
    bankAccount: any,
  ): Promise<void> {
    // Mock implementation - in real app this would call Unit API
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) {
      throw new Error('Unit API temporarily unavailable');
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.log(`Mock Unit API submission for batch ${batch.batch_id}`, {
      totalAmount: batch.total_amount,
      itemCount: items.length,
      bankAccountId: bankAccount.account_id,
    });
  }

  /**
   * Convert PayoutBatch entity to PayoutBatchView DTO
   */
  private toPayoutBatchView(batch: any): PayoutBatchView {
    return {
      batchId: batch.batch_id,
      startDate: batch.start_date,
      endDate: batch.end_date,
      totalAmount: batch.total_amount,
      itemCount: batch.item_count,
      currency: batch.currency,
      status: batch.status,
      estimatedDeliveryDate: this.calculateEstimatedDeliveryDate(batch.end_date),
      createdAt: batch.created_time.getTime(),
    };
  }
}
