import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { UnitService } from '../integration/unit.service';
import { BankService } from '../bank/bank.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let unitService: UnitService;
  let bankService: BankService;
  let paymentRepository: PaymentRepository;

  const mockPayment = {
    id: 1,
    user_id: 1,
    amount: 10000, // $100.00 in cents
    description: 'Test payment',
    status: 'PENDING',
    direction: 'DEBIT',
    recipient_name: 'John Doe',
    recipient_email: 'john@example.com',
    created_at: new Date(),
    unit_payment_id: 'unit_payment_123',
    unit_status: 'pending',
  };

  const mockBankAccount = {
    accountId: 1,
    bankName: 'Chase Bank',
    mask: '****7890',
    method: 'ACH',
    country: 'US',
    isPrimary: true,
    status: 'ACTIVE',
    unitCounterpartyStatus: 'ACTIVE',
    createdTime: Date.now(),
  };

  const mockUnitPayment = {
    data: {
      id: 'unit_payment_123',
      attributes: {
        amount: 10000,
        description: 'Test payment',
        status: 'Pending',
        direction: 'Debit',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: UnitService,
          useValue: {
            createPayment: jest.fn().mockResolvedValue(mockUnitPayment),
            getPayment: jest.fn().mockResolvedValue(mockUnitPayment),
          },
        },
        {
          provide: BankService,
          useValue: {
            getBankAccounts: jest.fn().mockResolvedValue([mockBankAccount]),
          },
        },
        {
          provide: PaymentRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPayment),
            findByUser: jest.fn().mockResolvedValue([mockPayment]),
            findById: jest.fn().mockResolvedValue(mockPayment),
            updateStatus: jest.fn().mockResolvedValue(undefined),
            findAll: jest
              .fn()
              .mockResolvedValue({ data: [mockPayment], total: 1 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'UNIT_ACCOUNT_ID':
                  return 'unit_account_123';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    unitService = module.get<UnitService>(UnitService);
    bankService = module.get<BankService>(BankService);
    paymentRepository = module.get<PaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 10000,
      description: 'Test payment',
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      recipientRoutingNumber: '021000021',
      recipientAccountNumber: '1234567890',
      sameDay: false,
    };

    it('should create a payment successfully', async () => {
      const result = await service.createPayment(1, createPaymentDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.amount).toBe(10000);
      expect(result.description).toBe('Test payment');
      expect(result.status).toBe('PENDING');
      expect(result.recipientName).toBe('John Doe');

      expect(unitService.createPayment).toHaveBeenCalled();
      expect(paymentRepository.create).toHaveBeenCalled();
    });

    it('should validate minimum payment amount', async () => {
      const invalidDto = { ...createPaymentDto, amount: 50 }; // Less than $1.00

      await expect(service.createPayment(1, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate maximum payment amount', async () => {
      const invalidDto = { ...createPaymentDto, amount: 10000000 }; // More than $100,000

      await expect(service.createPayment(1, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Unit API failures', async () => {
      jest
        .spyOn(unitService, 'createPayment')
        .mockRejectedValue(new Error('Unit API error'));

      await expect(service.createPayment(1, createPaymentDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should require recipient information', async () => {
      const invalidDto = { ...createPaymentDto, recipientName: '' };

      await expect(service.createPayment(1, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPayments', () => {
    it('should return user payments with pagination', async () => {
      const result = await service.getPayments(1, { page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.total).toBe(1);

      expect(paymentRepository.findByUser).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 10,
      });
    });

    it('should filter payments by status', async () => {
      const result = await service.getPayments(1, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });

      expect(paymentRepository.findByUser).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });
    });
  });

  describe('getPaymentById', () => {
    it('should return a specific payment', async () => {
      const result = await service.getPaymentById(1, 1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.amount).toBe(10000);

      expect(paymentRepository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should return null for non-existent payment', async () => {
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue(null);

      const result = await service.getPaymentById(1, 999);

      expect(result).toBeNull();
    });
  });

  describe('getAllPaymentsForAdmin', () => {
    it('should return all payments for admin with pagination', async () => {
      const result = await service.getAllPaymentsForAdmin({
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);

      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should support search functionality', async () => {
      const result = await service.getAllPaymentsForAdmin({
        page: 1,
        limit: 10,
        search: 'john@example.com',
      });

      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'john@example.com',
      });
    });
  });

  describe('approvePayment', () => {
    it('should approve a pending payment', async () => {
      const result = await service.approvePayment(1);

      expect(result).toEqual({ success: true });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
        1,
        'PROCESSING',
      );
    });

    it('should handle non-existent payment', async () => {
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue(null);

      await expect(service.approvePayment(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectPayment', () => {
    it('should reject a pending payment', async () => {
      const result = await service.rejectPayment(1, 'Insufficient funds');

      expect(result).toEqual({ success: true });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
        1,
        'REJECTED',
      );
    });

    it('should handle rejection without reason', async () => {
      const result = await service.rejectPayment(1);

      expect(result).toEqual({ success: true });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
        1,
        'REJECTED',
      );
    });
  });
});
