import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TickersController } from './tickers.controller';
import { TickersService } from './tickers.service';

@Module({
  imports: [AuthModule],
  controllers: [TickersController],
  providers: [TickersService],
  exports: [TickersService],
})
export class TickersModule {}
