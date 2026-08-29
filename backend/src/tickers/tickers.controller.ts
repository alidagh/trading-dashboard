import { Controller, Get } from '@nestjs/common';
import type { TickerListResponse } from '@trading-dashboard/contracts';
import { TickersService } from './tickers.service';

@Controller('tickers')
export class TickersController {
  constructor(private readonly tickers: TickersService) {}

  @Get()
  list(): TickerListResponse {
    return this.tickers.list();
  }
}
