import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY!, // API Key
  process.env.MAILJET_SECRET_KEY! // Secret Key
);

export const sendEmailVerification = async (email: string, token: string) => {
  // Ensure we have the correct URL with no trailing slash
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Create the full verification link
  const verificationLink = `${cleanBaseUrl}/auth/verify-email?token=${token}`;
  
  console.log("Sending verification email to:", email);
  console.log("Verification link:", verificationLink);

  try {
    const _result = await mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "hemerotecadigitalreal@gmail.com", // Cambia a tu dominio o correo verificado
            Name: "HemoPress",
          },
          To: [
            {
              Email: email,
              Name: "Usuario",
            },
          ],
          Subject: "Verifica tu correo electrónico - HemoPress",
          HTMLPart: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; }
                .content { padding: 20px; background-color: #f8f9fa; border-radius: 5px; }
                .button { 
                  display: inline-block; 
                  background-color: #0070f3; 
                  color: white !important; 
                  text-decoration: none; 
                  padding: 12px 24px; 
                  border-radius: 4px; 
                  margin: 20px 0;
                }
                .link-container { 
                  margin: 15px 0; 
                  padding: 10px; 
                  background-color: #e9ecef; 
                  border-radius: 4px; 
                  word-break: break-all;
                }
                .footer { text-align: center; font-size: 12px; color: #6c757d; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Verificación de Correo Electrónico</h1>
                </div>
                <div class="content">
                  <p>Hola,</p>
                  <p>Gracias por registrarte en HemoPress. Para completar tu registro y activar tu cuenta, haz clic en el botón a continuación:</p>
                  
                  <div style="text-align: center;">
                    <a href="${verificationLink}" class="button">Verificar mi correo electrónico</a>
                  </div>
                  
                  <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                  <div class="link-container">
                    ${verificationLink}
                  </div>
                  
                  <p>Este enlace expirará en 24 horas por motivos de seguridad.</p>
                  <p>Si no has solicitado esta verificación, puedes ignorar este correo.</p>
                </div>
                <div class="footer">
                  <p> 2025 HemoPress. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          TextPart: `Gracias por registrarte en HemoPress. Para verificar tu correo electrónico, visita el siguiente enlace: ${verificationLink} (Este enlace expirará en 24 horas por motivos de seguridad)`
        },
      ],
    });

    console.log("Verification email sent successfully");
    return { success: true };

  } catch (error) {
    console.error("Mailjet error:", error);
    return { success: false, error: "Error interno al enviar el correo" };
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  try {
    const _result = await mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "hemerotecadigitalreal@gmail.com", // Cambia a tu dominio o correo verificado
            Name: "HemoPress Security",
          },
          To: [
            {
              Email: email,
              Name: "Usuario",
            },
          ],
          Subject: "Password Reset Request",
          HTMLPart: `
            <h1>Password Reset</h1>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}"
               style="
                   background-color: #e53e3e;
                   color: white;
                   padding: 12px 24px;
                   text-decoration: none;
                   border-radius: 4px;
                   display: inline-block;
               ">
                Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>Or copy this link:</p>
            <code>${resetLink}</code>
          `,
        },
      ],
    });

    return { success: true };

  } catch (error) {
    console.error("Mailjet error:", error);
    return { success: false, error: "Internal server error" };
  }
};

export const sendAccountDeletionEmail = async (email: string, token: string) => {
  // Ensure we have the correct URL with no trailing slash
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Create the full deletion confirmation link
  const deletionLink = `${cleanBaseUrl}/auth/confirm-deletion?token=${token}`;
  
  console.log("Sending account deletion confirmation email to:", email);
  console.log("Deletion confirmation link:", deletionLink);

  try {
    const _result = await mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "hemerotecadigitalreal@gmail.com",
            Name: "HemoPress",
          },
          To: [
            {
              Email: email,
              Name: "Usuario",
            },
          ],
          Subject: "Confirmación para eliminar tu cuenta - HemoPress",
          HTMLPart: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; }
                .content { padding: 20px; background-color: #f8f9fa; border-radius: 5px; }
                .button { 
                  display: inline-block; 
                  background-color: #e53e3e; 
                  color: white !important; 
                  text-decoration: none; 
                  padding: 12px 24px; 
                  border-radius: 4px; 
                  margin: 20px 0;
                }
                .warning {
                  color: #e53e3e;
                  font-weight: bold;
                }
                .link-container { 
                  margin: 15px 0; 
                  padding: 10px; 
                  background-color: #e9ecef; 
                  border-radius: 4px; 
                  word-break: break-all;
                }
                .footer { text-align: center; font-size: 12px; color: #6c757d; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Confirmación de Eliminación de Cuenta</h1>
                </div>
                <div class="content">
                  <p>Hola,</p>
                  <p>Hemos recibido una solicitud para eliminar tu cuenta de HemoPress. Para confirmar esta acción, por favor haz clic en el botón a continuación:</p>
                  
                  <div style="text-align: center;">
                    <a href="${deletionLink}" class="button">Confirmar eliminación de cuenta</a>
                  </div>
                  
                  <p class="warning">ADVERTENCIA: Esta acción no se puede deshacer. Toda tu información y contenido se eliminará permanentemente.</p>
                  
                  <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                  <div class="link-container">
                    ${deletionLink}
                  </div>
                  
                  <p>Este enlace expirará en 24 horas por motivos de seguridad.</p>
                  <p>Si no has solicitado eliminar tu cuenta, puedes ignorar este correo y tu cuenta permanecerá activa.</p>
                </div>
                <div class="footer">
                  <p> 2025 HemoPress. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          TextPart: `Hemos recibido una solicitud para eliminar tu cuenta de HemoPress. Para confirmar esta acción, visita el siguiente enlace: ${deletionLink} (Este enlace expirará en 24 horas por motivos de seguridad). ADVERTENCIA: Esta acción no se puede deshacer. Toda tu información y contenido se eliminará permanentemente.`
        },
      ],
    });

    console.log("Account deletion confirmation email sent successfully");
    return { success: true };

  } catch (error) {
    console.error("Mailjet error:", error);
    return { success: false, error: "Error interno al enviar el correo" };
  }
};