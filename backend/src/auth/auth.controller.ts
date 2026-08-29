import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { LoginRequest, LoginResponse } from '@trading-dashboard/contracts';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() credentials: LoginRequest): LoginResponse {
    const session = this.auth.signIn(
      credentials?.username,
      credentials?.password,
    );

    if (!session) {
      throw new UnauthorizedException('Wrong username or password');
    }

    return session;
  }
}
