import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class BankAccountRepository {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    private dataSource: DataSource,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Create encrypted bank account
   */
  async createEncryptedAccount(data: {
    userId: number;
    branchId: number;
    accountNumber: string;
    holderName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    method: 'ACH' | 'WIRE';
    currency: string;
    makePrimary: boolean;
  }): Promise<BankAccount> {
    // Encrypt sensitive fields
    const encryptedAccountNumber = await this.cryptoService.encryptField(data.accountNumber);
    const encryptedHolderName = await this.cryptoService.encryptField(data.holderName);

    // Handle primary account logic
    if (data.makePrimary) {
      await this.unsetOtherPrimaryAccounts(data.userId);
    }

    // Create bank account
    const bankAccount = this.bankAccountRepository.create({
      user_id: data.userId,
      branch_id: data.branchId,
      encrypted_account_number: encryptedAccountNumber,
      encrypted_account_holder_name: encryptedHolderName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      method: data.method,
      currency: data.currency,
      is_primary: data.makePrimary ? 1 : 0,
      status: 'ACTIVE',
      unit_counterparty_status: 'PENDING',
      encrypted: 1,
      created_by: data.userId,
      updated_by: data.userId,
    });

    return await this.bankAccountRepository.save(bankAccount);
  }

  /**
   * Set account as primary and unset others
   */
  async setPrimary(accountId: number, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Unset other primary accounts
      await manager
        .createQueryBuilder()
        .update(BankAccount)
        .set({ is_primary: 0, updated_by: userId })
        .where('user_id = :userId AND account_id != :accountId', { userId, accountId })
        .execute();

      // Set this account as primary
      await manager
        .createQueryBuilder()
        .update(BankAccount)
        .set({ is_primary: 1, updated_by: userId })
        .where('account_id = :accountId', { accountId })
        .execute();
    });
  }

  /**
   * Deactivate account
   */
  async deactivate(accountId: number, userId: number): Promise<void> {
    const account = await this.bankAccountRepository.findOne({
      where: { account_id: accountId },
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    // Check if this is the last active account
    const activeAccounts = await this.bankAccountRepository.count({
      where: { user_id: account.user_id, status: 'ACTIVE' },
    });

    if (activeAccounts <= 1) {
      throw new Error('Cannot deactivate the last active account');
    }

    await this.bankAccountRepository.update(accountId, {
      status: 'INACTIVE',
      is_primary: 0,
      updated_by: userId,
    });
  }

  /**
   * Get accounts by user
   */
  async findByUser(userId: number): Promise<BankAccount[]> {
    return await this.bankAccountRepository.find({
      where: { user_id: userId },
      relations: ['branch'],
      order: { is_primary: 'DESC', created_time: 'DESC' },
    });
  }

  /**
   * Update Unit counterparty status
   */
  async updateUnitCounterpartyStatus(
    accountId: number,
    counterpartyId: string | null,
    status: 'PENDING' | 'ACTIVE' | 'REJECTED',
    userId: number,
  ): Promise<void> {
    await this.bankAccountRepository.update(accountId, {
      unit_counterparty_id: counterpartyId,
      unit_counterparty_status: status,
      updated_by: userId,
    });
  }

  /**
   * Check if user should have primary account
   */
  async shouldBePrimary(userId: number, makePrimary?: boolean): Promise<boolean> {
    if (makePrimary !== undefined) {
      return makePrimary;
    }

    // Check if user has any active accounts
    const activeAccounts = await this.bankAccountRepository.count({
      where: { user_id: userId, status: 'ACTIVE' },
    });

    return activeAccounts === 0;
  }

  /**
   * Find primary account by user
   */
  async findPrimaryByUser(userId: number): Promise<BankAccount | null> {
    return await this.bankAccountRepository.findOne({
      where: { user_id: userId, is_primary: 1, status: 'ACTIVE' },
      relations: ['branch'],
    });
  }

  /**
   * Unset other primary accounts for a user
   */
  private async unsetOtherPrimaryAccounts(userId: number): Promise<void> {
    await this.bankAccountRepository
      .createQueryBuilder()
      .update(BankAccount)
      .set({ is_primary: 0 })
      .where('user_id = :userId', { userId })
      .execute();
  }
}
