import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseService } from './supabase/supabase.service.js';
import { vi } from 'vitest';

describe('AppController', () => {
  let appController: AppController;
  let supabase: { isOnline: ReturnType<typeof vi.fn>; getClient: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    supabase = {
      isOnline: vi.fn().mockResolvedValue(true),
      getClient: vi.fn().mockReturnValue({
        from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }),
      }),
    };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: SupabaseService, useValue: supabase }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('exposes non-sensitive liveness without external calls', () => {
    expect(appController.liveness()).toEqual({ status: 'ok' });
    expect(supabase.isOnline).not.toHaveBeenCalled();
  });

  it('reports ready only when Auth and database query both work', async () => {
    await expect(appController.readiness()).resolves.toEqual({ status: 'ok' });
    supabase.isOnline.mockResolvedValue(false);
    await expect(appController.readiness()).rejects.toMatchObject({ status: 503 });
    supabase.isOnline.mockResolvedValue(true);
    supabase.getClient.mockReturnValue({
      from: () => ({ select: () => ({ limit: async () => ({ error: { message: 'failure' } }) }) }),
    });
    await expect(appController.readiness()).rejects.toMatchObject({ status: 503 });
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
