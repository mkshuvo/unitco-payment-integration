import { 
  Controller, 
  Post, 
  Get,
  Body, 
  Param,
  Query,
  UseGuards, 
  Req, 
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { PayoutService } from './payout.service';
import { CreatePayoutBatchDto } from './dto/create-payout-batch.dto';
import { PayoutBatchView } from './dto/payout-batch-view.dto';
import { PayoutPreviewDto } from './dto/payout-preview.dto';

// TODO: Replace with actual JWT guard when auth is implemented
const MockJwtGuard = {
  canActivate: () => true,
};

// TODO: Replace with actual role guard when RBAC is implemented  
const MockRoleGuard = (role: string) => ({
  canActivate: () => true,
});

@Controller('providers/me/payouts')
export class PayoutController {
  private readonly logger = new Logger(PayoutController.name);

  constructor(private payoutService: PayoutService) {}

  @Get('preview')
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async getPayoutPreview(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<PayoutPreviewDto> {
    const userId = req.user?.id || 1;

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
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async createPayoutBatch(
    @Req() req: any,
    @Body() dto: CreatePayoutBatchDto,
  ): Promise<PayoutBatchView> {
    const userId = req.user?.id || 1;

    this.logger.log(`Creating payout batch for user ${userId}`, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      idempotencyKey: dto.idempotencyKey,
    });

    try {
      const batch = await this.payoutService.createPayoutBatch(dto, userId);

      this.logger.log(`Created payout batch ${batch.batchId} for user ${userId}`, {
        batchId: batch.batchId,
        totalAmount: batch.totalAmount,
        itemCount: batch.itemCount,
      });

      return batch;
    } catch (error) {
      this.logger.error(`Failed to create payout batch for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  @Post('batches/:batchId/submit')
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async submitPayoutBatch(
    @Req() req: any,
    @Param('batchId', ParseIntPipe) batchId: number,
  ): Promise<{ message: string }> {
    const userId = req.user?.id || 1;

    this.logger.log(`Submitting payout batch ${batchId} for user ${userId}`);

    try {
      await this.payoutService.submitPayoutBatch(batchId, userId);

      this.logger.log(`Successfully submitted payout batch ${batchId} for user ${userId}`);

      return { message: 'Payout batch submitted successfully' };
    } catch (error) {
      this.logger.error(`Failed to submit payout batch ${batchId} for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  @Get('batches')
  @UseGuards(MockJwtGuard as any, MockRoleGuard('PROVIDER') as any)
  async getPayoutBatches(@Req() req: any): Promise<PayoutBatchView[]> {
    const userId = req.user?.id || 1;

    this.logger.log(`Getting payout batches for user ${userId}`);

    try {
      const batches = await this.payoutService.getPayoutBatches(userId);

      this.logger.log(`Retrieved ${batches.length} payout batches for user ${userId}`);

      return batches;
    } catch (error) {
      this.logger.error(`Failed to get payout batches for user ${userId}`, {
        error: error.message,
      });
      throw error;
    }
  }
}
