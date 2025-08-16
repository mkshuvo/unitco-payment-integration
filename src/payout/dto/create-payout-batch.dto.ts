import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class CreatePayoutBatchDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
