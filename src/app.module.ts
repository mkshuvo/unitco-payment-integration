import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { BankModule } from './bank/bank.module';
import { CryptoModule } from './crypto/crypto.module';
import { PayoutModule } from './payout/payout.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { IntegrationModule } from './integration/integration.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(config),
    }),
    DatabaseModule,
    AuditModule,
    BankModule,
    CryptoModule,
    PayoutModule,
    ApiKeysModule,
    IntegrationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
