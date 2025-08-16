import { IsString, IsEnum, IsOptional, IsBoolean, Length, Matches } from 'class-validator';

export class AddAchBankDto {
  @IsString()
  @Length(1, 100)
  holderName: string;

  @IsEnum(['checking', 'savings'])
  accountType: 'checking' | 'savings';

  @IsString()
  @Length(9, 9)
  @Matches(/^\d{9}$/, { message: 'Routing number must be exactly 9 digits' })
  routingNumber: string;

  @IsString()
  @Length(4, 17)
  @Matches(/^\d+$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @IsString()
  @Length(1, 100)
  address1: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  address2?: string;

  @IsString()
  @Length(1, 50)
  city: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2-letter code' })
  state: string;

  @IsString()
  @Length(5, 10)
  @Matches(/^[\d-]+$/, { message: 'ZIP must contain only digits and hyphens' })
  zip: string;

  @IsOptional()
  @IsBoolean()
  makePrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  sameDayEligible?: boolean; // informational
}
