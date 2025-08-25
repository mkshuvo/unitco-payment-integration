import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnitService } from './unit.service';
import { ResolveCustomerDto } from './dto/resolve-customer.dto';
import { CreateCustomerTokenDto } from './dto/create-customer-token.dto';
import { CreateTokenVerificationDto } from './dto/create-token-verification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('integration/unit')
export class IntegrationController {
  constructor(
    private readonly unit: UnitService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get('status')
  async status() {
    return this.unit.checkStatus();
  }

  @Post('application-forms')
  async createApplicationForm(@Body() body?: any) {
    try {
      const { tags, whiteLabelThemeId } = body || {};
      return await this.unit.createApplicationForm({ tags, whiteLabelThemeId });
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Failed to create Application Form',
        500,
      );
    }
  }

  @Post('customers/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveCustomer(@Body() dto: ResolveCustomerDto) {
    const customerId = await this.unit.resolveCustomerIdByEmail(dto.email);
    let persisted = false;
    if (customerId && dto.userId) {
      const user = await this.users.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      // Ensure uniqueness: if another user already has this customer id, reject
      const existing = await this.users.findOne({
        where: { unit_customer_id: customerId },
      });
      if (existing && existing.id !== user.id) {
        throw new BadRequestException('Unit customer already linked to another user');
      }
      user.unit_customer_id = customerId;
      await this.users.save(user);
      persisted = true;
    }
    return { email: dto.email, customerId, persisted };
  }

  @Post('customers/:id/token/verification')
  @HttpCode(HttpStatus.CREATED)
  async createCustomerTokenVerification(
    @Param('id') id: string,
    @Body() dto: CreateTokenVerificationDto,
  ) {
    const result = await this.unit.createCustomerTokenVerification({
      customerId: id,
      channel: dto.channel,
      phone: dto.phone,
      locale: dto.locale,
    });
    return result;
  }

  @Post('customers/:id/token')
  @HttpCode(HttpStatus.CREATED)
  async createCustomerToken(
    @Param('id') id: string,
    @Body() dto: CreateCustomerTokenDto,
  ) {
    const usingJwt = !!dto.jwtToken;
    const using2fa = !!dto.verificationToken && !!dto.verificationCode;
    if (!usingJwt && !using2fa) {
      throw new BadRequestException(
        'Provide either jwtToken or verificationToken + verificationCode',
      );
    }
    const result = await this.unit.createCustomerToken({
      customerId: id,
      scope: dto.scope,
      jwtToken: dto.jwtToken,
      verificationToken: dto.verificationToken,
      verificationCode: dto.verificationCode,
      expiresIn: dto.expiresIn,
    });
    return result;
  }
}
