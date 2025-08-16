import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { PayoutBatch } from '../entities/payout-batch.entity';
import { PayoutItem } from '../entities/payout-item.entity';
import { PayoutBatchRepository } from '../repositories/payout-batch.repository';
import { PayoutItemRepository } from '../repositories/payout-item.repository';
import { BankAccountRepository } from '../repositories/bank-account.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutBatch, PayoutItem]),
  ],
  controllers: [PayoutController],
  providers: [
    PayoutService,
    PayoutBatchRepository,
    PayoutItemRepository,
    BankAccountRepository,
  ],
  exports: [PayoutService],
})
export class PayoutModule {}
