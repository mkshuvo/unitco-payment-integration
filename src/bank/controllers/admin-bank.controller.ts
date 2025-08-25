import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { BankService } from '../bank.service';
import { AddAchBankDto } from '../dto/add-ach-bank.dto';
import { BankAccountView } from '../dto/bank-account-view.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';
import { Audit } from '../../audit/decorators/audit.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AdminBankController {
  constructor(private readonly bankService: BankService) {}

  @Post('users/:id/banks/ach')
  @Roles('ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'BANK_ACCOUNT_ADD', resourceType: 'bank_account', resourceIdParam: 'id' })
  async addAchBankAccountForUser(
    @CurrentUser() user: any,
    @Param('id') userId: number,
    @Body() dto: AddAchBankDto,
  ): Promise<BankAccountView> {
    return this.bankService.addAchBankAccount(userId, dto);
  }

  @Get('users/:id/banks')
  @Roles('ADMIN', 'ACCOUNTANT')
  async getBankAccountsForUser(
    @CurrentUser() user: any,
    @Param('id') userId: number,
  ): Promise<BankAccountView[]> {
    return this.bankService.getBankAccounts(userId);
  }

  @Get('banks')
  @Roles('ADMIN')
  async getAllBankAccounts(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('size') size = 50,
    @Query('status') status?: string,
  ): Promise<{
    data: BankAccountView[];
    total: number;
    page: number;
    size: number;
  }> {
    return this.bankService.getAllBankAccounts({
      page: Number(page),
      size: Number(size),
      status,
    });
  }
}
