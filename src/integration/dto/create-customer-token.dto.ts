import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCustomerTokenDto {
  @IsString()
  scope!: string; // space-delimited scopes per Unit docs

  @IsOptional()
  @IsString()
  verificationToken?: string;

  @IsOptional()
  @IsString()
  verificationCode?: string;

  @IsOptional()
  @IsString()
  jwtToken?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number; // seconds
}
