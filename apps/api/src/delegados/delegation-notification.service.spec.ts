import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DelegationNotificationService } from './delegation-notification.service.js';

describe('DelegationNotificationService', () => {
  let service: DelegationNotificationService;
  let mockSupabaseService: any;
  let mockConfigService: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    mockSupabaseService = {
      getAdminClient: vi.fn().mockReturnValue(mockClient),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('test'),
    };
    service = new DelegationNotificationService(mockSupabaseService, mockConfigService);
  });

  it('persists in-app notification and sinks test email delivery', async () => {
    const result = await service.notifyInvitationCreated({
      gestorId: 'gestor-1',
      gestorName: 'Gestor Carlos',
      delegadoId: 'delegado-1',
      delegadoEmail: 'delegado@test.com',
      invitationId: 'inv-1',
    });

    expect(mockClient.from).toHaveBeenCalledWith('notificaciones');
    expect(mockClient.from).toHaveBeenCalledWith('email_delivery_outbox');
    expect(result).toEqual({
      inApp: 'created',
      email: 'sent',
    });
  });
});
