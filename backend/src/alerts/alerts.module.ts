import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TickersModule } from '../tickers/tickers.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [AuthModule, TickersModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
