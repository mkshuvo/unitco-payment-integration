import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKey } from '../entities/api-key.entity';
import { CryptoModule } from '../crypto/crypto.module';
import { ConfigModule } from '@nestjs/config';
import { MockAdminGuard } from '../auth/mock-admin.guard';

@Module({
  imports: [ConfigModule, CryptoModule, TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, MockAdminGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
