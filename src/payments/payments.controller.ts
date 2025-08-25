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
import { PaymentsService, CreatePaymentRequest, PaymentView } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';

@Controller('users/me/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_CREATE', resourceType: 'payment' })
  async createPayment(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentRequest,
  ): Promise<PaymentView> {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  async getPayments(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PaymentView[]> {
    return this.paymentsService.getPayments(user.id, { limit, offset });
  }

  @Get(':id')
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  async getPayment(
    @CurrentUser() user: any,
    @Param('id') paymentId: string,
  ): Promise<PaymentView | null> {
    return this.paymentsService.getPayment(user.id, paymentId);
  }
}

@Controller('admin/users/:userId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_CREATE', resourceType: 'payment', resourceIdParam: 'userId' })
  async createPaymentForUser(
    @CurrentUser() user: any,
    @Param('userId') userId: number,
    @Body() dto: CreatePaymentRequest,
  ): Promise<PaymentView> {
    return this.paymentsService.createPayment(userId, dto);
  }

  @Get()
  @Roles('ADMIN', 'ACCOUNTANT')
  async getPaymentsForUser(
    @CurrentUser() user: any,
    @Param('userId') userId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PaymentView[]> {
    return this.paymentsService.getPayments(userId, { limit, offset });
  }
}
