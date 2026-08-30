import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { MarketDataModule } from './market-data/market-data.module';
import { TickersModule } from './tickers/tickers.module';

@Module({
  imports: [AuthModule, TickersModule, AlertsModule, MarketDataModule],
})
export class AppModule {}
