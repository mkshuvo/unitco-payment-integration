import { Injectable, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { BankBranchRepository } from '../repositories/bank-branch.repository';
import { BankAccountRepository } from '../repositories/bank-account.repository';
import { AddAchBankDto } from './dto/add-ach-bank.dto';
import { BankAccountView } from './dto/bank-account-view.dto';
import { isValidUsRouting, isValidUsAccountNumber, maskAccountNumber } from './validators';

@Injectable()
export class BankService {
  constructor(
    private cryptoService: CryptoService,
    private bankBranchRepository: BankBranchRepository,
    private bankAccountRepository: BankAccountRepository,
  ) {}

  /**
   * Validates ACH bank account data and creates encrypted record
   */
  async addAchBankAccount(userId: number, dto: AddAchBankDto): Promise<BankAccountView> {
    // Server-side validation
    if (!isValidUsRouting(dto.routingNumber)) {
      throw new BadRequestException('INVALID_ROUTING_NUMBER');
    }

    if (!isValidUsAccountNumber(dto.accountNumber)) {
      throw new BadRequestException('INVALID_ACCOUNT_NUMBER');
    }

    // Normalize address data
    const normalizedState = dto.state.toUpperCase().trim();
    const normalizedCity = dto.city.trim();
    const normalizedZip = dto.zip.trim();

    // Get or create bank branch
    const bankName = await this.bankBranchRepository.getBankNameFromRouting(dto.routingNumber);
    const branch = await this.bankBranchRepository.findOrCreateByRouting(
      'US',
      dto.routingNumber,
      bankName,
      userId,
    );

    // Determine if this should be primary
    const shouldBePrimary = await this.bankAccountRepository.shouldBePrimary(userId, dto.makePrimary);

    // Create bank account record
    const bankAccount = await this.bankAccountRepository.createEncryptedAccount({
      userId,
      branchId: branch.id,
      accountNumber: dto.accountNumber,
      holderName: dto.holderName,
      address1: dto.address1,
      address2: dto.address2,
      city: normalizedCity,
      state: normalizedState,
      zip: normalizedZip,
      country: 'US',
      method: 'ACH',
      currency: 'USD',
      makePrimary: shouldBePrimary,
    });

    // Attempt Unit counterparty creation (mock for now)
    try {
      const unitCounterpartyId = await this.createUnitCounterparty(dto);
      await this.bankAccountRepository.updateUnitCounterpartyStatus(
        bankAccount.account_id,
        unitCounterpartyId,
        'ACTIVE',
        userId,
      );
    } catch (error) {
      await this.bankAccountRepository.updateUnitCounterpartyStatus(
        bankAccount.account_id,
        null,
        'REJECTED',
        userId,
      );
      throw new UnprocessableEntityException('UNIT_COUNTERPARTY_REJECTED');
    }

    return this.toBankAccountView(bankAccount);
  }

  /**
   * Get bank accounts for a user
   */
  async getBankAccounts(userId: number): Promise<BankAccountView[]> {
    const accounts = await this.bankAccountRepository.findByUser(userId);
    return accounts.map(account => this.toBankAccountView(account));
  }

  /**
   * Creates Unit counterparty (mock implementation)
   */
  private async createUnitCounterparty(dto: AddAchBankDto): Promise<string> {
    // Mock implementation - in real app this would call Unit API
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Unit API temporarily unavailable');
    }
    
    return `unit_cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert BankAccount entity to BankAccountView DTO
   */
  private toBankAccountView(bankAccount: any): BankAccountView {
    return {
      accountId: bankAccount.account_id,
      bankName: bankAccount.branch?.bank_name || 'Unknown Bank',
      mask: bankAccount.mask || '****',
      method: bankAccount.method,
      country: bankAccount.country,
      isPrimary: bankAccount.is_primary === 1,
      status: bankAccount.status,
      unitCounterpartyStatus: bankAccount.unit_counterparty_status,
      createdTime: bankAccount.created_time.getTime(),
    };
  }
}
