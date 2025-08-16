import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutBatch } from '../entities/payout-batch.entity';

@Injectable()
export class PayoutBatchRepository {
  constructor(
    @InjectRepository(PayoutBatch)
    private payoutBatchRepository: Repository<PayoutBatch>,
  ) {}

  /**
   * Create a new payout batch
   */
  async createBatch(data: {
    userId: number;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    itemCount: number;
    currency: string;
    idempotencyKey: string;
    status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  }): Promise<PayoutBatch> {
    const batch = this.payoutBatchRepository.create({
      user_id: data.userId,
      start_date: data.startDate,
      end_date: data.endDate,
      total_amount: data.totalAmount,
      item_count: data.itemCount,
      currency: data.currency,
      idempotency_key: data.idempotencyKey,
      status: data.status,
      created_by: data.userId,
      updated_by: data.userId,
    });

    return await this.payoutBatchRepository.save(batch);
  }

  /**
   * Find batch by user and idempotency key
   */
  async findByUserAndKey(userId: number, idempotencyKey: string): Promise<PayoutBatch | null> {
    return await this.payoutBatchRepository.findOne({
      where: { user_id: userId, idempotency_key: idempotencyKey },
    });
  }

  /**
   * Find batch by ID
   */
  async findById(batchId: number): Promise<PayoutBatch | null> {
    return await this.payoutBatchRepository.findOne({
      where: { batch_id: batchId },
    });
  }

  /**
   * Get batches by user
   */
  async findByUser(userId: number): Promise<PayoutBatch[]> {
    return await this.payoutBatchRepository.find({
      where: { user_id: userId },
      order: { created_time: 'DESC' },
    });
  }

  /**
   * Update batch status
   */
  async updateStatus(
    batchId: number,
    status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED',
    userId: number,
  ): Promise<void> {
    await this.payoutBatchRepository.update(batchId, {
      status,
      updated_by: userId,
    });
  }

  /**
   * Update Unit batch ID
   */
  async updateUnitBatchId(batchId: number, unitBatchId: string, userId: number): Promise<void> {
    await this.payoutBatchRepository.update(batchId, {
      unit_batch_id: unitBatchId,
      updated_by: userId,
    });
  }
}
