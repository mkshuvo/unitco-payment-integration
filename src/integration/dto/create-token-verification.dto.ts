import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PhoneDto {
  @IsString()
  countryCode!: string;

  @IsString()
  number!: string;
}

export class CreateTokenVerificationDto {
  @IsIn(['sms', 'call'])
  channel!: 'sms' | 'call';

  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneDto)
  phone?: PhoneDto;

  @IsOptional()
  @IsString()
  locale?: string;
}
