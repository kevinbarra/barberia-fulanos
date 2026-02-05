import { Resend } from 'resend';
import { ROOT_DOMAIN, SENDER_EMAIL } from './constants';

const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Notificación de Cita Confirmada (Cliente)
export async function sendBookingEmail(data: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  time: string;
  barberName: string;
  businessName?: string;
}) {
  if (!data.clientEmail) return;

  const business = data.businessName || 'AgendaBarber';

  try {
    await resend.emails.send({
      from: `${business} <${SENDER_EMAIL}>`,
      to: [data.clientEmail],
      subject: `✅ Cita Confirmada: ${data.serviceName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">¡Hola, ${data.clientName}!</h1>
          <p>Tu cita ha sido confirmada exitosamente.</p>
          
          <div style="background: #f4f4f5; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0;"><strong>Servicio:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Barbero:</strong> ${data.barberName}</p>
            <p style="margin: 0;"><strong>Fecha:</strong> ${data.date} a las ${data.time}</p>
          </div>

          <p>Te esperamos en <strong>${business}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Si necesitas cancelar o reagendar, por favor contáctanos.</p>
        </div>
      `,
    });
  } catch {
    // Email is non-critical, silently fail
  }
}

// 2. Notificación de Nueva Reserva (Staff/Owner)
export async function sendStaffNewBookingNotification(data: {
  staffEmail: string;
  staffName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName?: string;
  isOwnerNotification?: boolean;
}) {
  console.log('[EMAIL] Attempting to send staff notification:', {
    to: data.staffEmail,
    staffName: data.staffName,
    isOwner: data.isOwnerNotification
  });

  if (!data.staffEmail) {
    console.log('[EMAIL] No staffEmail provided, skipping');
    return;
  }

  const business = data.businessName || 'AgendaBarber';
  const forWhom = data.isOwnerNotification
    ? `para <strong>${data.staffName}</strong>`
    : 'para ti';

  try {
    const result = await resend.emails.send({
      from: `${business} <${SENDER_EMAIL}>`,
      to: [data.staffEmail],
      subject: `📅 Nueva Reserva: ${data.clientName} - ${data.serviceName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Nueva Reserva ${forWhom}</h1>
          
          <div style="background: linear-gradient(135deg, #f59e0b20 0%, #f9731620 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 18px;"><strong>${data.clientName}</strong></p>
            <p style="margin: 8px 0; color: #666;">${data.serviceName}</p>
            <p style="margin: 0; font-size: 16px;">📅 ${data.date} a las ${data.time}</p>
          </div>

          <p style="color: #666;">Prepárate para recibir a tu cliente.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://${ROOT_DOMAIN}/admin" style="background-color: #f59e0b; color: #000; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-weight: bold; display: inline-block;">
              Ver en Agenda
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Este es un mensaje automático de ${business}.</p>
        </div>
      `,
    });
    console.log('[EMAIL] Staff notification sent successfully:', result);
  } catch (error) {
    console.error('[EMAIL] Error sending staff notification:', error);
  }
}

// 3. Recordatorio de Cita (24h antes)
export async function sendBookingReminder(data: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  businessName?: string;
}) {
  if (!data.clientEmail) return;

  const business = data.businessName || 'AgendaBarber';

  try {
    await resend.emails.send({
      from: `${business} <${SENDER_EMAIL}>`,
      to: [data.clientEmail],
      subject: `⏰ Recordatorio: Tu cita es mañana`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">¡Hola, ${data.clientName}!</h1>
          <p>Te recordamos que tienes una cita <strong>mañana</strong>.</p>
          
          <div style="background: linear-gradient(135deg, #3b82f620 0%, #8b5cf620 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 18px;"><strong>${data.serviceName}</strong></p>
            <p style="margin: 8px 0; color: #666;">con ${data.barberName}</p>
            <p style="margin: 0; font-size: 16px;">📅 ${data.date} a las ${data.time}</p>
          </div>

          <p>Te esperamos en <strong>${business}</strong>.</p>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Si no puedes asistir, por favor avísanos con anticipación.</p>
        </div>
      `,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// 4. Invitación a Staff (Barbero/Admin)
export async function sendStaffInvitation(data: {
  email: string;
  businessName: string;
  inviteLink: string;
}) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: `AgendaBarber <${SENDER_EMAIL}>`,
      to: [data.email],
      subject: `Invitación: Únete al equipo de ${data.businessName}`,
      html: `
        <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #eaeaea; border-radius: 16px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #000; color: #fff; width: 40px; height: 40px; border-radius: 50%; line-height: 40px; font-weight: bold; margin: 0 auto;">F.</div>
          </div>

          <h2 style="font-weight: 900; letter-spacing: -0.5px; text-align: center; margin-bottom: 10px;">Te quieren en el equipo.</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
            <strong>${data.businessName}</strong> te ha invitado a colaborar en su plataforma de gestión como Staff. Tendrás acceso a la agenda y terminal punto de venta.
          </p>
          
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="${data.inviteLink}" style="background-color: #000; color: #fff; padding: 16px 32px; border-radius: 100px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              Aceptar Invitación
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />

          <p style="font-size: 12px; color: #999; text-align: center;">
            Si no reconoces este negocio, puedes ignorar este correo de forma segura.<br/>
            Este enlace es único para <strong>${data.email}</strong>.
          </p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: emailData?.id };

  } catch {
    return { success: false, error: 'Fallo de conexión con servicio de correo.' };
  }
}

// 5. Post-Service Rating Request (Smart Reputation Funnel)
export async function sendRatingRequestEmail(data: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  barberName: string;
  bookingId: string;
  businessName?: string;
  tenantSlug?: string;
}) {
  if (!data.clientEmail) return { success: false };

  const business = data.businessName || 'AgendaBarber';
  const baseUrl = data.tenantSlug
    ? `https://${data.tenantSlug}.${ROOT_DOMAIN}`
    : `https://${ROOT_DOMAIN}`;
  const ratingUrl = `${baseUrl}/rate/${data.bookingId}`;

  // Generate large tappable star buttons
  const generateStarButton = (rating: number) => {
    const isGold = rating >= 4;
    const color = isGold ? '#fbbf24' : '#71717a';
    return `
      <a href="${ratingUrl}?r=${rating}" style="text-decoration: none; display: inline-block; margin: 0 4px;">
        <div style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
      </a>
    `;
  };

  try {
    await resend.emails.send({
      from: `${business} <${SENDER_EMAIL}>`,
      to: [data.clientEmail],
      subject: `⭐ ¿Cómo fue tu experiencia en ${business}?`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #000; font-size: 24px; margin: 0;">¡Hola, ${data.clientName}!</h1>
            <p style="color: #666; font-size: 16px; margin-top: 8px;">
              Gracias por visitarnos. Tu opinión nos importa mucho.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px 24px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0;">Tu visita</p>
            <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0 0 4px 0;">${data.serviceName}</p>
            <p style="color: #a1a1aa; font-size: 14px; margin: 0;">con ${data.barberName}</p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              ¿Cómo calificarías tu experiencia?
            </p>
            
            <div style="margin: 0 auto;">
              ${generateStarButton(1)}
              ${generateStarButton(2)}
              ${generateStarButton(3)}
              ${generateStarButton(4)}
              ${generateStarButton(5)}
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 12px;">
              Toca una estrella para calificar
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            Este correo fue enviado por ${business}. Si no reconoces esta visita, puedes ignorar este mensaje.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('[sendRatingRequestEmail] Error:', error);
    return { success: false };
  }
}

// 6. Win-Back Email (Retention Campaign)
export async function sendWinBackEmail(data: {
  clientName: string;
  clientEmail: string;
  daysSinceLastVisit: number;
  businessName?: string;
  bookingUrl?: string;
}) {
  if (!data.clientEmail) return { success: false };

  const business = data.businessName || 'AgendaBarber';
  const bookingUrl = data.bookingUrl || `https://${ROOT_DOMAIN}`;

  try {
    await resend.emails.send({
      from: `${business} <${SENDER_EMAIL}>`,
      to: [data.clientEmail],
      subject: `¡Te extrañamos, ${data.clientName.split(' ')[0]}! 💈`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 16px;">💈</div>
            <h1 style="color: #000; font-size: 24px; margin: 0;">¡Te extrañamos!</h1>
          </div>

          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 24px; border-radius: 16px; text-align: center; margin-bottom: 24px; border: 1px solid #fcd34d;">
            <p style="color: #92400e; font-size: 16px; margin: 0;">
              Han pasado <strong>${data.daysSinceLastVisit} días</strong> desde tu última visita.
            </p>
            <p style="color: #a16207; font-size: 14px; margin: 8px 0 0 0;">
              ¡Es hora de un nuevo corte!
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${bookingUrl}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 100px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Reservar Ahora →
            </a>
          </div>

          <p style="color: #666; text-align: center; font-size: 14px;">
            Te esperamos en <strong>${business}</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            Si ya no deseas recibir estos correos, puedes ignorar este mensaje.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('[sendWinBackEmail] Error:', error);
    return { success: false };
  }
}