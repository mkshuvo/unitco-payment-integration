import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { PayoutService } from './payout.service';
import { CreatePayoutBatchDto } from './dto/create-payout-batch.dto';
import { PayoutBatchView } from './dto/payout-batch-view.dto';
import { PayoutPreviewDto } from './dto/payout-preview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { User } from '../entities/user.entity';

@Controller('providers/me/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PayoutController {
  private readonly logger = new Logger(PayoutController.name);

  constructor(private payoutService: PayoutService) {}

  @Get('preview')
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_CREATE', resourceType: 'payout' })
  async getPayoutPreview(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<PayoutPreviewDto> {
    const userId = user.id;

    this.logger.log(`Getting payout preview for user ${userId}`, {
      startDate,
      endDate,
    });

    try {
      const preview = await this.payoutService.computePayoutPreview(
        new Date(startDate),
        new Date(endDate),
        userId,
      );

      this.logger.log(`Computed payout preview for user ${userId}`, {
        totalAmount: preview.totalAmount,
        itemCount: preview.itemCount,
      });

      return preview;
    } catch (error) {
      this.logger.error(`Failed to compute payout preview for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  @Post('batches')
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_CREATE', resourceType: 'payout' })
  async createPayoutBatch(
    @CurrentUser() user: User,
    @Body() dto: CreatePayoutBatchDto,
  ): Promise<PayoutBatchView> {
    const userId = user.id;

    this.logger.log(`Creating payout batch for user ${userId}`, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      idempotencyKey: dto.idempotencyKey,
    });

    try {
      const batch = await this.payoutService.createPayoutBatch(dto, userId);

      this.logger.log(
        `Created payout batch ${batch.batchId} for user ${userId}`,
        {
          batchId: batch.batchId,
          totalAmount: batch.totalAmount,
          itemCount: batch.itemCount,
        },
      );

      return batch;
    } catch (error) {
      this.logger.error(`Failed to create payout batch for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  @Post('batches/:batchId/submit')
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_APPROVE', resourceType: 'payout' })
  async submitPayoutBatch(
    @CurrentUser() user: User,
    @Param('batchId', ParseIntPipe) batchId: number,
  ): Promise<PayoutBatchView> {
    const userId = user.id;

    this.logger.log(`Submitting payout batch ${batchId} for user ${userId}`);

    try {
      const batch = await this.payoutService.submitPayoutBatch(batchId, userId);

      this.logger.log(
        `Successfully submitted payout batch ${batchId} for user ${userId}`,
      );

      return batch;
    } catch (error) {
      this.logger.error(
        `Failed to submit payout batch ${batchId} for user ${userId}`,
        {
          error: error.message,
        },
      );
      throw error;
    }
  }

  @Get('batches')
  @Roles('USER', 'ADMIN', 'ACCOUNTANT')
  @Audit({ action: 'PAYMENT_CREATE', resourceType: 'payout' })
  async getPayoutBatches(
    @CurrentUser() user: User,
  ): Promise<PayoutBatchView[]> {
    const userId = user.id;

    this.logger.log(`Getting payout batches for user ${userId}`);

    try {
      const batches = await this.payoutService.getPayoutBatches(userId);

      this.logger.log(
        `Retrieved ${batches.length} payout batches for user ${userId}`,
      );

      return batches;
    } catch (error) {
      this.logger.error(`Failed to get payout batches for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }
}
