import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { USER_SEED } from './user-seed';

describe('AuthService', () => {
  const seeded = USER_SEED[0];
  let auth: AuthService;
  let jwt: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    auth = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  it('signs in as a existing user', () => {
    const session = auth.signIn(seeded.username, seeded.password);

    expect(session?.user).toEqual({
      id: seeded.id,
      username: seeded.username,
      name: seeded.name,
      role: seeded.role,
    });
    expect(session?.token.split('.')).toHaveLength(3);
  });

  it('never returns the password in session ', () => {
    const session = auth.signIn(seeded.username, seeded.password);

    expect(session?.user).not.toHaveProperty('password');
    expect(JSON.stringify(session)).not.toContain(seeded.password);
  });

  it('rejects an invald password', () => {
    expect(auth.signIn(seeded.username, 'not-the-password')).toBeUndefined();
  });

  it('rejects an unknown user who is not seeded', () => {
    expect(auth.signIn('ahmad', 'hasan111')).toBeUndefined();
  });

  it('rejects nonsense and empty tokens', () => {
    expect(auth.verify('not-a-jwt')).toBeUndefined();
    expect(auth.verify('')).toBeUndefined();
  });

  it('rejects a token signed with wrong secret', () => {
    const forged = new JwtService({ secret: 'random-different-secret' }).sign({
      sub: seeded.id,
      username: seeded.username,
      name: seeded.name,
      role: seeded.role,
    });

    expect(auth.verify(forged)).toBeUndefined();
  });

  it('rejects an expired token', () => {
    const stale = jwt.sign(
      { sub: seeded.id, username: seeded.username },
      { expiresIn: '-1s' },
    );

    expect(auth.verify(stale)).toBeUndefined();
  });
});
