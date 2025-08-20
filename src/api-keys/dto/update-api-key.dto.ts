import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  secret?: string;
}
