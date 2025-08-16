import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutItem } from '../entities/payout-item.entity';

@Injectable()
export class PayoutItemRepository {
  constructor(
    @InjectRepository(PayoutItem)
    private payoutItemRepository: Repository<PayoutItem>,
  ) {}

  /**
   * Create a new payout item
   */
  async createItem(data: {
    batchId: number;
    userId: number;
    amount: number;
    currency: string;
    description: string;
    referenceId: string;
    status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  }): Promise<PayoutItem> {
    const item = this.payoutItemRepository.create({
      batch_id: data.batchId,
      user_id: data.userId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      reference_id: data.referenceId,
      status: data.status,
      created_by: data.userId,
      updated_by: data.userId,
    });

    return await this.payoutItemRepository.save(item);
  }

  /**
   * Get items by batch ID
   */
  async findByBatchId(batchId: number): Promise<PayoutItem[]> {
    return await this.payoutItemRepository.find({
      where: { batch_id: batchId },
      order: { created_time: 'ASC' },
    });
  }

  /**
   * Update status for all items in a batch
   */
  async updateStatusByBatchId(
    batchId: number,
    status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED',
  ): Promise<void> {
    await this.payoutItemRepository
      .createQueryBuilder()
      .update(PayoutItem)
      .set({ status })
      .where('batch_id = :batchId', { batchId })
      .execute();
  }

  /**
   * Update Unit payment ID for an item
   */
  async updateUnitPaymentId(itemId: number, unitPaymentId: string, userId: number): Promise<void> {
    await this.payoutItemRepository.update(itemId, {
      unit_payment_id: unitPaymentId,
      updated_by: userId,
    });
  }
}
