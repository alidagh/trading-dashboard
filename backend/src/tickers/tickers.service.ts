import { Injectable } from '@nestjs/common';
import { Ticker } from '@trading-dashboard/contracts';
import { TICKER_SEED } from './ticker-seed';

@Injectable()
export class TickersService {
  private readonly tickers = TICKER_SEED;

  list(): Ticker[] {
    return this.tickers;
  }
}
