import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(_config: FullConfig) {
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const authPath = path.join(authDir, 'user.json');

  // Provide deterministic non-production test adapter auth state on clean checkouts
  // Eliminates external login, real OTP, and cached credentials dependency
  const userId = '11111111-1111-1111-1111-111111111111';
  const email = 'gestor@test.com';
  const role = 'gestor';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      role: 'authenticated',
      user_metadata: { role, rol: role },
      accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    })
  ).toString('base64');
  const token = `${header}.${body}.mocksignature`;

  const cookiePayload = {
    access_token: token,
    user: {
      id: userId,
      email,
      user_metadata: { role, rol: role },
    },
  };
  const cookieValue = `base64-${Buffer.from(JSON.stringify(cookiePayload)).toString('base64')}`;

  const storageState = {
    cookies: [
      {
        name: 'sb-127-auth-token',
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 30,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'sb-localhost-auth-token',
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 30,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };

  fs.writeFileSync(authPath, JSON.stringify(storageState, null, 2), 'utf8');
}

export default globalSetup;
