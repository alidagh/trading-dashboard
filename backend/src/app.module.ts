import { Module } from '@nestjs/common';
import { MarketDataModule } from './market-data/market-data.module';
import { TickersModule } from './tickers/tickers.module';

@Module({
  imports: [TickersModule, MarketDataModule],
})
export class AppModule {}
