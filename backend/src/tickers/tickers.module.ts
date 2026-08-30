import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from '../auth/auth.module';
import { TickersController } from './tickers.controller';
import { TickersService } from './tickers.service';

const HISTORY_TTL_MS = Number(process.env.HISTORY_CACHE_TTL_MS ?? 60_000);

@Module({
  imports: [AuthModule, CacheModule.register({ ttl: HISTORY_TTL_MS })],
  controllers: [TickersController],
  providers: [TickersService],
  exports: [TickersService],
})
export class TickersModule {}
