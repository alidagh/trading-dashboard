import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@trading-dashboard/contracts';
import { AuthService } from './auth.service';

// Only ever handed to a route behind this guard, so the user is already resolved.
export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');

    const user =
      scheme === 'Bearer' && token ? this.auth.verify(token) : undefined;

    if (!user) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    request.user = user;

    return true;
  }
}
