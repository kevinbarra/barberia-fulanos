import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Inicializar Resend con tu API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { businessName, email, phone, message } = body

        // Validación básica
        if (!businessName || !email || !message) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        // Check for CONTACT_EMAIL configuration
        const contactEmail = process.env.CONTACT_EMAIL;
        if (!contactEmail) {
            console.warn('⚠️ [CONTACT] Variable CONTACT_EMAIL no configurada. Usando fallback: kevinbarra2001@gmail.com');
        }

        // Enviar email usando Resend
        const emailData = await resend.emails.send({
            from: 'AgendaBarber <contacto@agendabarber.pro>', // Dominio verificado
            to: [contactEmail || 'kevinbarra2001@gmail.com'],
            replyTo: email,
            subject: `🚀 Nuevo Lead: ${businessName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                        .field { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #F59E0B; }
                        .label { font-weight: bold; color: #F59E0B; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
                        .value { margin-top: 5px; font-size: 16px; }
                        .message-box { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb; }
                        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                        .badge { display: inline-block; background: #10b981; color: white; padding: 5px 10px; border-radius: 15px; font-size: 11px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✨ Nuevo Lead de AgendaBarber</h1>
                            <span class="badge">ALTA PRIORIDAD</span>
                        </div>
                        <div class="content">
                            <div class="field">
                                <div class="label">🏪 Barbería</div>
                                <div class="value">${businessName}</div>
                            </div>
                            
                            <div class="field">
                                <div class="label">✉️ Email</div>
                                <div class="value"><a href="mailto:${email}">${email}</a></div>
                            </div>
                            
                            ${phone ? `
                            <div class="field">
                                <div class="label">📞 Teléfono</div>
                                <div class="value"><a href="tel:${phone}">${phone}</a></div>
                            </div>
                            ` : ''}
                            
                            <div class="message-box">
                                <div class="label">💬 Mensaje</div>
                                <div class="value">${message}</div>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p><strong>Próximos pasos:</strong> Contactar en menos de 24 horas para agendar demo.</p>
                            <p>AgendaBarber - Sistema de Gestión para Barberías</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        })

        return NextResponse.json({ success: true, messageId: emailData.data?.id })
    } catch (error) {
        console.error('Error enviando email:', error)
        return NextResponse.json(
            { error: 'Error al enviar mensaje' },
            { status: 500 }
        )
    }
}
