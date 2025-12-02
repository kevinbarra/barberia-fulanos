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
}) {
  // Validación básica: Si no hay email, no hacemos nada
  if (!data.clientEmail) return;

  try {
    await resend.emails.send({
      from: 'Barbería Fulanos <onboarding@resend.dev>', // Usar dominio verificado en Prod
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

          <p>Te esperamos en <strong>Barbería Fulanos</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Si necesitas cancelar o reagendar, por favor contáctanos.</p>
        </div>
      `,
    });
    console.log(`📧 Email cita enviado a ${data.clientEmail}`);
  } catch (error) {
    console.error("❌ Error enviando email cita:", error);
  }
}

// 2. NUEVO: Invitación a Staff (Barbero/Admin)
export async function sendStaffInvitation(data: {
  email: string;
  businessName: string;
  inviteLink: string;
}) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'Barbería Fulanos <onboarding@resend.dev>',
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
      console.error("Resend API Error:", error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Invitación enviada correctamente a ${data.email}`);
    return { success: true, id: emailData?.id };

  } catch (error) {
    console.error("❌ Error inesperado enviando invitación:", error);
    return { success: false, error: 'Fallo de conexión con servicio de correo.' };
  }
}