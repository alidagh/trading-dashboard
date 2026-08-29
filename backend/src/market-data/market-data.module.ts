import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TickersModule } from '../tickers/tickers.module';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  imports: [AuthModule, TickersModule],
  providers: [MarketDataGateway],
})
export class MarketDataModule {}
