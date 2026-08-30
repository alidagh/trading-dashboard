import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';
import { TickersModule } from '../tickers/tickers.module';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  imports: [AuthModule, TickersModule, AlertsModule],
  providers: [MarketDataGateway],
})
export class MarketDataModule {}
