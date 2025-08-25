import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController } from './payments.controller';
import { BankAccount } from '../entities/bank-account.entity';
import { UnitModule } from '../unit/unit.module';
import { CryptoService } from '../crypto/crypto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccount]),
    UnitModule,
  ],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, CryptoService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
