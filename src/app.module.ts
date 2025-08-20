import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(config),
    }),
    DatabaseModule,
    BankModule,
    CryptoModule,
    PayoutModule,
    ApiKeysModule,
    IntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
