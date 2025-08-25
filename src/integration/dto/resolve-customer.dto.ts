import { IsEmail, IsInt, IsOptional, Min } from 'class-validator';

export class ResolveCustomerDto {
  @IsEmail()
  email!: string;

  // Optional until JWT auth is wired; when provided, we'll persist unit_customer_id
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
