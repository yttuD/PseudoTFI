import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isTestAdapterEnabled } from '../../../web/src/lib/test-adapter.js';

describe('Test Adapter Security Guard (isTestAdapterEnabled)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects test adapter when NODE_ENV is production even if flag is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_ALLOW_DEV_TOKENS = 'true';
    expect(isTestAdapterEnabled()).toBe(false);
  });

  it('rejects test adapter when VERCEL_ENV is production even if flag is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.VERCEL_ENV = 'production';
    process.env.AUTH_ALLOW_DEV_TOKENS = 'true';
    expect(isTestAdapterEnabled()).toBe(false);
  });

  it('rejects test adapter when AUTH_ALLOW_DEV_TOKENS is not true', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    delete process.env.AUTH_ALLOW_DEV_TOKENS;
    delete process.env.NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS;
    expect(isTestAdapterEnabled()).toBe(false);
  });

  it('allows test adapter in non-production when AUTH_ALLOW_DEV_TOKENS is true', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    process.env.AUTH_ALLOW_DEV_TOKENS = 'true';
    expect(isTestAdapterEnabled()).toBe(true);
  });

  it('allows test adapter in non-production when NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS is true', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    delete process.env.AUTH_ALLOW_DEV_TOKENS;
    process.env.NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS = 'true';
    expect(isTestAdapterEnabled()).toBe(true);
  });
});
