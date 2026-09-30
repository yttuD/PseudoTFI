import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service.js';
import { InvitationChannelStatus } from '@tfi/types';

@Injectable()
export class DelegationNotificationService {
  private readonly logger = new Logger(DelegationNotificationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async notifyInvitationCreated(params: {
    gestorId: string;
    gestorName: string;
    delegadoId: string;
    delegadoEmail: string;
    invitationId: string;
  }): Promise<InvitationChannelStatus> {
    const { gestorName, delegadoId, delegadoEmail, invitationId } = params;
    const client = this.supabaseService.getAdminClient();

    let inAppStatus: 'created' | 'read' = 'created';
    let emailStatus: 'pending' | 'sent' | 'failed' = 'pending';

    // 1. Create In-App notification
    try {
      await client.from('notificaciones').insert({
        usuario_id: delegadoId,
        tipo: 'invitacion_delegado',
        referencia_id: invitationId,
        titulo: 'Nueva invitación de Delegado',
        mensaje: `${gestorName || 'Un Gestor'} te ha invitado a colaborar como Delegado en su espacio de trabajo en Rendo.`,
      });
      inAppStatus = 'created';
    } catch (err) {
      this.logger.warn(`Could not persist in-app notification: ${err}`);
    }

    // 2. Outbox email record
    const emailSink = this.configService.get<string>('INVITATION_EMAIL_SINK') || 'test';
    const isTestSink = emailSink === 'test' || emailSink === 'console';

    try {
      const now = new Date().toISOString();
      const status = isTestSink ? 'sent' : 'pending';
      const sentAt = isTestSink ? now : null;

      await client.from('email_delivery_outbox').insert({
        recipient_user_id: delegadoId,
        recipient_email: delegadoEmail,
        template_key: 'delegado_invitation',
        payload: {
          gestorName,
          invitationId,
        },
        reference_type: 'delegado_invitation',
        reference_id: invitationId,
        status,
        sent_at: sentAt,
      });

      emailStatus = status;
    } catch (err) {
      this.logger.warn(`Could not persist email outbox entry: ${err}`);
      emailStatus = 'failed';
    }

    return {
      inApp: inAppStatus,
      email: emailStatus,
    };
  }
}
