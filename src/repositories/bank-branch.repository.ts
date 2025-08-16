import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankBranch } from '../entities/bank-branch.entity';

@Injectable()
export class BankBranchRepository {
  constructor(
    @InjectRepository(BankBranch)
    private bankBranchRepository: Repository<BankBranch>,
  ) {}

  /**
   * Find or create bank branch by US routing number
   */
  async findOrCreateByRouting(
    country: string,
    routingNumber: string,
    bankName: string,
    userId: number,
  ): Promise<BankBranch> {
    // Try to find existing branch
    let branch = await this.bankBranchRepository.findOne({
      where: { country, routing: routingNumber },
    });

    if (!branch) {
      // Create new branch
      branch = this.bankBranchRepository.create({
        country,
        routing: routingNumber,
        bank_name: bankName,
        created_by: userId,
        updated_by: userId,
      });
      await this.bankBranchRepository.save(branch);
    }

    return branch;
  }

  /**
   * Find or create bank branch by SWIFT code
   */
  async findOrCreateBySwift(
    swift: string,
    bankName: string,
    userId: number,
  ): Promise<BankBranch> {
    // Try to find existing branch
    let branch = await this.bankBranchRepository.findOne({
      where: { swift },
    });

    if (!branch) {
      // Create new branch
      branch = this.bankBranchRepository.create({
        swift,
        bank_name: bankName,
        country: 'INTL', // Default for international
        created_by: userId,
        updated_by: userId,
      });
      await this.bankBranchRepository.save(branch);
    }

    return branch;
  }

  /**
   * Get bank name from routing number (mock implementation for now)
   * In production, this would query a routing number database
   */
  async getBankNameFromRouting(routingNumber: string): Promise<string> {
    // Mock implementation - in real app this would lookup in routing database
    const bankNames = [
      'Chase Bank',
      'Bank of America',
      'Wells Fargo',
      'Citibank',
      'US Bank',
      'PNC Bank',
      'Capital One',
      'TD Bank',
    ];
    
    const index = parseInt(routingNumber.slice(-2)) % bankNames.length;
    return bankNames[index];
  }
}
