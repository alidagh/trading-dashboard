import { AuthUser } from '@trading-dashboard/contracts';

export type SeededUser = AuthUser & { password: string };

export const USER_SEED: SeededUser[] = [
  {
    id: 'u1',
    username: 'alidagh',
    password: 'ali@1234',
    name: 'Ali Daghman',
    role: 'Trader',
  },
  {
    id: 'u2',
    username: 'yarah',
    password: 'yara@344',
    name: 'Yara Hamoud',
    role: 'Admin',
  },
];
