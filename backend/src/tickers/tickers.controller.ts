import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import type {
  TickerHistoryResponse,
  TickerListResponse,
} from '@trading-dashboard/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TickersService } from './tickers.service';

@Controller('tickers')
@UseGuards(JwtAuthGuard)
export class TickersController {
  constructor(private readonly tickers: TickersService) {}

  @Get()
  list(): TickerListResponse {
    return this.tickers.list();
  }

  @Get(':symbol/history')
  async history(
    @Param('symbol') symbol: string,
  ): Promise<TickerHistoryResponse> {
    const points = await this.tickers.historyFor(symbol);
    if (!points) {
      throw new NotFoundException(`No ticker for symbol ${symbol}`);
    }

    return { symbol: symbol.toUpperCase(), points };
  }
}
