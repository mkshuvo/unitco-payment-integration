import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnitService } from './unit.service';
import { IntegrationController } from './integration.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Module({
  imports: [ConfigModule, ApiKeysModule, TypeOrmModule.forFeature([User])],
  controllers: [IntegrationController],
  providers: [UnitService],
  exports: [UnitService],
})
export class IntegrationModule {}
