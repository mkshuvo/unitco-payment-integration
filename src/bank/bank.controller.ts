import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { AddAchBankDto } from './dto/add-ach-bank.dto';
import { BankAccountView } from './dto/bank-account-view.dto';
import { CryptoService } from '../crypto/crypto.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';

@Controller('providers/me/bank-accounts')
export class BankController {
  private readonly logger = new Logger(BankController.name);

  constructor(
    private bankService: BankService,
    private cryptoService: CryptoService,
  ) {}

  @Post('ach')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @UseInterceptors(AuditInterceptor)
  @Audit({ action: 'BANK_ACCOUNT_ADD', resourceType: 'bank_account' })
  async addAchBankAccount(
    @CurrentUser() user: any,
    @Body() dto: AddAchBankDto,
  ): Promise<BankAccountView> {
    const userId = user.id;

    // Log request with sensitive data redacted
    this.logger.log(`Adding ACH bank account for user ${userId}`, {
      routingNumber: this.cryptoService.maskSensitiveData(
        dto.routingNumber,
        'routing',
      ),
      accountNumber: this.cryptoService.maskSensitiveData(
        dto.accountNumber,
        'account',
      ),
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  async getBankAccounts(@CurrentUser() user: any): Promise<BankAccountView[]> {
    const userId = user.id;

    this.logger.log(`Getting bank accounts for user ${userId}`);

    try {
      const accounts = await this.bankService.getBankAccounts(userId);

      this.logger.log(
        `Retrieved ${accounts.length} bank accounts for user ${userId}`,
      );

      return accounts;
    } catch (error) {
      this.logger.error(`Failed to get bank accounts for user ${userId}`, {
        error: error.message,
      });

      throw error;
    }
  }
}
