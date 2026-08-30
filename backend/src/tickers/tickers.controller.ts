import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HISTORY_INTERVALS } from '@trading-dashboard/contracts';
import type {
  HistoryInterval,
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
    @Query('interval') requested?: string,
  ): Promise<TickerHistoryResponse> {
    const interval = (requested ?? '1m') as HistoryInterval;
    if (!HISTORY_INTERVALS.includes(interval)) {
      throw new BadRequestException(
        `interval must be one of ${HISTORY_INTERVALS.join(', ')}`,
      );
    }

    const points = await this.tickers.historyFor(symbol, interval);
    if (!points) {
      throw new NotFoundException(`No ticker for symbol ${symbol}`);
    }

    return { symbol: symbol.toUpperCase(), interval, points };
  }
}
