import { Module } from '@nestjs/common';
import { TickersModule } from '../tickers/tickers.module';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  imports: [TickersModule],
  providers: [MarketDataGateway],
})
export class MarketDataModule {}
