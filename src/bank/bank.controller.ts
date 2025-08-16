import { 
  Controller, 
  Post, 
  Get,
  Body, 
  UseGuards, 
  Req, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { BankService } from './bank.service';
import { AddAchBankDto } from './dto/add-ach-bank.dto';
import { BankAccountView } from './dto/bank-account-view.dto';
import { CryptoService } from '../crypto/crypto.service';

// TODO: Replace with actual JWT guard when auth is implemented
const MockJwtGuard = {
  canActivate: () => true,
};

// TODO: Replace with actual role guard when RBAC is implemented  
const MockRoleGuard = (role: string) => ({
  canActivate: () => true,
});

@Controller('providers/me/bank-accounts')
export class BankController {
  private readonly logger = new Logger(BankController.name);

  constructor(
    private bankService: BankService,
    private cryptoService: CryptoService,
  ) {}

  @Post('ach')
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async addAchBankAccount(
    @Req() req: any,
    @Body() dto: AddAchBankDto
  ): Promise<BankAccountView> {
    // Mock user ID for now - will come from JWT token
    const userId = req.user?.id || 1;

    // Log request with sensitive data redacted
    this.logger.log(`Adding ACH bank account for user ${userId}`, {
      routingNumber: this.cryptoService.maskSensitiveData(dto.routingNumber, 'routing'),
      accountNumber: this.cryptoService.maskSensitiveData(dto.accountNumber, 'account'),
      holderName: this.cryptoService.maskSensitiveData(dto.holderName, 'name'),
      accountType: dto.accountType,
      city: dto.city,
      state: dto.state,
      zip: dto.zip,
    });

    try {
      const result = await this.bankService.addAchBankAccount(userId, dto);
      
      // Log success with masked data
      this.logger.log(`Successfully added bank account ${result.accountId}`, {
        accountId: result.accountId,
        mask: result.mask,
        bankName: result.bankName,
        unitCounterpartyStatus: result.unitCounterpartyStatus,
      });

      return result;
    } catch (error) {
      // Log error without sensitive data
      this.logger.error(`Failed to add bank account for user ${userId}`, {
        error: error.message,
        accountId: error.accountId,
      });
      
      throw error;
    }
  }

  @Get()
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async getBankAccounts(@Req() req: any): Promise<BankAccountView[]> {
    const userId = req.user?.id || 1;

    this.logger.log(`Getting bank accounts for user ${userId}`);

    try {
      const accounts = await this.bankService.getBankAccounts(userId);
      
      this.logger.log(`Retrieved ${accounts.length} bank accounts for user ${userId}`);
      
      return accounts;
    } catch (error) {
      this.logger.error(`Failed to get bank accounts for user ${userId}`, {
        error: error.message,
      });
      
      throw error;
    }
  }
}
