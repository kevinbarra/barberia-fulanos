import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingEmail(data: {
    clientName: string;
    clientEmail: string;
    serviceName: string;
    date: string;
    time: string;
    barberName: string;
}) {
    // Validación básica
    if (!data.clientEmail) return;

    try {
        await resend.emails.send({
            from: 'Barbería Fulanos <onboarding@resend.dev>', // Dominio de prueba oficial
            to: [data.clientEmail], // <--- AQUÍ LLEGARÁN LOS CORREOS DE PRUEBA
            subject: `✅ Cita Confirmada: ${data.serviceName}`,
            html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">¡Hola, ${data.clientName}!</h1>
          <p>Tu cita ha sido confirmada exitosamente.</p>
          
          <div style="background: #f4f4f5; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Servicio:</strong> ${data.serviceName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Barbero:</strong> ${data.barberName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Fecha:</strong> ${data.date}</p>
            <p style="margin: 0;"><strong>Hora:</strong> ${data.time}</p>
          </div>

          <p>Te esperamos en <strong>Barbería Fulanos</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Si necesitas cancelar o reagendar, por favor contáctanos.</p>
        </div>
      `,
        });
        console.log("📧 Email enviado correctamente a kevinbarra2001@gmail.com");
    } catch (error) {
        console.error("❌ Error enviando email:", error);
    }
}