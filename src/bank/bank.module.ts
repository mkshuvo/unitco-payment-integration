import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { CryptoModule } from '../crypto/crypto.module';
import { BankBranch } from '../entities/bank-branch.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { BankBranchRepository } from '../repositories/bank-branch.repository';
import { BankAccountRepository } from '../repositories/bank-account.repository';

@Module({
  imports: [
    CryptoModule,
    TypeOrmModule.forFeature([BankBranch, BankAccount]),
  ],
  controllers: [BankController],
  providers: [BankService, BankBranchRepository, BankAccountRepository],
  exports: [BankService],
})
export class BankModule {}
