import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BankService } from './bank.service';
import { CryptoService } from '../crypto/crypto.service';
import { BankBranchRepository } from '../repositories/bank-branch.repository';
import { BankAccountRepository } from '../repositories/bank-account.repository';
import { BankBranch } from '../entities/bank-branch.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { AddAchBankDto } from './dto/add-ach-bank.dto';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';

describe('BankService', () => {
  let service: BankService;
  let cryptoService: CryptoService;
  let bankBranchRepository: BankBranchRepository;
  let bankAccountRepository: BankAccountRepository;

  const mockBankBranch = {
    id: 1,
    bank_name: 'Chase Bank',
    country: 'US',
    routing: '021000021',
  };

  const mockBankAccount = {
    account_id: 1,
    user_id: 1,
    branch_id: 1,
    mask: '****7890',
    method: 'ACH',
    country: 'US',
    is_primary: 1,
    status: 'ACTIVE',
    unit_counterparty_status: 'ACTIVE',
    created_time: new Date(),
    branch: mockBankBranch,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        {
          provide: CryptoService,
          useValue: {
            encryptField: jest.fn().mockResolvedValue('encrypted_data'),
            maskSensitiveData: jest.fn().mockImplementation((data, type) => {
              switch (type) {
                case 'account': return `****${data.slice(-4)}`;
                case 'routing': return `${data.slice(0, 4)}****${data.slice(-1)}`;
                case 'name': return `${data.slice(0, 1)}${'*'.repeat(data.length - 2)}${data.slice(-1)}`;
                default: return '****';
              }
            }),
          },
        },
        {
          provide: BankBranchRepository,
          useValue: {
            findOrCreateByRouting: jest.fn().mockResolvedValue(mockBankBranch),
            getBankNameFromRouting: jest.fn().mockResolvedValue('Chase Bank'),
          },
        },
        {
          provide: BankAccountRepository,
          useValue: {
            createEncryptedAccount: jest.fn().mockResolvedValue(mockBankAccount),
            shouldBePrimary: jest.fn().mockResolvedValue(true),
            updateUnitCounterpartyStatus: jest.fn().mockResolvedValue(undefined),
            findByUser: jest.fn().mockResolvedValue([mockBankAccount]),
          },
        },
        {
          provide: getRepositoryToken(BankBranch),
          useValue: {},
        },
        {
          provide: getRepositoryToken(BankAccount),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tdGVzdGluZy1wdXJwb3Nlcw=='),
          },
        },
      ],
    }).compile();

    service = module.get<BankService>(BankService);
    cryptoService = module.get<CryptoService>(CryptoService);
    bankBranchRepository = module.get<BankBranchRepository>(BankBranchRepository);
    bankAccountRepository = module.get<BankAccountRepository>(BankAccountRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addAchBankAccount', () => {
    const validDto: AddAchBankDto = {
      holderName: 'John Doe',
      accountType: 'checking',
      routingNumber: '021000021', // Valid Chase routing number
      accountNumber: '1234567890',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      makePrimary: true,
    };

    it('should successfully add a valid ACH bank account', async () => {
      const result = await service.addAchBankAccount(1, validDto);

      expect(result).toBeDefined();
      expect(result.accountId).toBe(1);
      expect(result.bankName).toBe('Chase Bank');
      expect(result.mask).toBe('****7890');
      expect(result.method).toBe('ACH');
      expect(result.country).toBe('US');
      expect(result.isPrimary).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.unitCounterpartyStatus).toBe('ACTIVE');

      expect(bankBranchRepository.findOrCreateByRouting).toHaveBeenCalledWith(
        'US',
        '021000021',
        'Chase Bank',
        1,
      );
      expect(bankAccountRepository.createEncryptedAccount).toHaveBeenCalled();
    });

    it('should reject invalid routing number', async () => {
      const invalidDto = { ...validDto, routingNumber: '123456789' };

      await expect(service.addAchBankAccount(1, invalidDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject invalid account number', async () => {
      const invalidDto = { ...validDto, accountNumber: '123' }; // Too short

      await expect(service.addAchBankAccount(1, invalidDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should handle Unit API failures gracefully', async () => {
      // Mock the service to simulate Unit API failure
      jest.spyOn(service as any, 'createUnitCounterparty').mockRejectedValue(new Error('Unit API error'));

      await expect(service.addAchBankAccount(1, validDto))
        .rejects
        .toThrow(UnprocessableEntityException);
    });
  });

  describe('getBankAccounts', () => {
    it('should return bank accounts for a user', async () => {
      const accounts = await service.getBankAccounts(1);

      expect(accounts).toHaveLength(1);
      expect(accounts[0].accountId).toBe(1);
      expect(accounts[0].bankName).toBe('Chase Bank');

      expect(bankAccountRepository.findByUser).toHaveBeenCalledWith(1);
    });
  });
});
