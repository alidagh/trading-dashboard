import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, LoginResponse } from '@trading-dashboard/contracts';
import { USER_SEED } from './user-seed';

type TokenClaims = {
  sub: string;
  username: string;
  name: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  signIn(username: string, password: string): LoginResponse | undefined {
    const found = USER_SEED.find(
      (user) => user.username === username && user.password === password,
    );

    if (!found) {
      return undefined;
    }

    const user: AuthUser = {
      id: found.id,
      username: found.username,
      name: found.name,
      role: found.role,
    };

    return {
      token: this.jwt.sign({
        sub: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      }),
      user,
    };
  }

  verify(token: string): AuthUser | undefined {
    try {
      const claims = this.jwt.verify<TokenClaims>(token);

      return {
        id: claims.sub,
        username: claims.username,
        name: claims.name,
        role: claims.role,
      };
    } catch {
      return undefined;
    }
  }
}
