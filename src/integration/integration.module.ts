import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnitService } from './unit.service';
import { IntegrationController } from './integration.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ConfigModule, ApiKeysModule],
  controllers: [IntegrationController],
  providers: [UnitService],
  exports: [UnitService],
})
export class IntegrationModule {}
