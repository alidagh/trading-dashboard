import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type {
  TickerHistoryResponse,
  TickerListResponse,
} from '@trading-dashboard/contracts';
import { TickersService } from './tickers.service';

@Controller('tickers')
export class TickersController {
  constructor(private readonly tickers: TickersService) {}

  @Get()
  list(): TickerListResponse {
    return this.tickers.list();
  }

  @Get(':symbol/history')
  history(@Param('symbol') symbol: string): TickerHistoryResponse {
    const points = this.tickers.historyFor(symbol);
    if (!points) {
      throw new NotFoundException(`No ticker for symbol ${symbol}`);
    }

    return { symbol: symbol.toUpperCase(), points };
  }
}
