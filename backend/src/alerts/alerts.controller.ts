import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  Alert,
  AlertListResponse,
  CreateAlertRequest,
} from '@trading-dashboard/contracts';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TickersService } from '../tickers/tickers.service';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly tickers: TickersService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): AlertListResponse {
    return this.alerts.list(request.user.id);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateAlertRequest,
  ): Alert {
    const ticker = this.tickers.findBySymbol(body?.symbol ?? '');
    if (!ticker) {
      throw new BadRequestException(`No ticker for symbol ${body?.symbol}`);
    }

    if (body.direction !== 'above' && body.direction !== 'below') {
      throw new BadRequestException("direction must be 'above' or 'below'");
    }

    const threshold = Number(body.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      throw new BadRequestException('threshold must be a price above zero');
    }

    return this.alerts.create(request.user.id, {
      symbol: ticker.symbol,
      direction: body.direction,
      threshold,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string): void {
    if (!this.alerts.remove(request.user.id, id)) {
      throw new NotFoundException(`No alert with id ${id}`);
    }
  }
}
