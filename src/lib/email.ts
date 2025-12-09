import { Resend } from 'resend';

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
      from: `${business} <reservas@agendabarber.pro>`,
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
      from: `${business} <reservas@agendabarber.pro>`,
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
            <a href="https://agendabarber.pro/admin" style="background-color: #f59e0b; color: #000; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-weight: bold; display: inline-block;">
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
      from: `${business} <reservas@agendabarber.pro>`,
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
      from: 'AgendaBarber <reservas@agendabarber.pro>',
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