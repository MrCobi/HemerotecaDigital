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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verificación de correo - HemoPress</title>
              <style>
                /* Base */
                body, html {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                /* Contenedor principal */
                .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                /* Cabecera */
                .email-header {
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white;
                  padding: 30px 20px;
                  text-align: center;
                }
                .email-header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 600;
                }
                .email-logo {
                  margin-bottom: 15px;
                }
                /* Contenido */
                .email-content {
                  padding: 30px;
                  background-color: #ffffff;
                }
                /* Botón de acción */
                .email-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white !important;
                  text-decoration: none;
                  font-weight: 600;
                  padding: 12px 30px;
                  margin: 20px 0;
                  border-radius: 6px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  transition: all 0.3s ease;
                }
                .email-button:hover {
                  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }
                /* Contenedor para enlaces */
                .email-link-container {
                  margin: 15px 0;
                  padding: 15px;
                  background-color: #f3f4f6;
                  border-left: 4px solid #3b82f6;
                  border-radius: 4px;
                  word-break: break-all;
                  font-size: 14px;
                  color: #4b5563;
                }
                /* Pie de página */
                .email-footer {
                  text-align: center;
                  padding: 20px;
                  color: #6b7280;
                  font-size: 12px;
                  border-top: 1px solid #e5e7eb;
                  background-color: #f9fafb;
                }
                /* Separador */
                .divider {
                  height: 1px;
                  width: 100%;
                  background-color: #e5e7eb;
                  margin: 20px 0;
                }
                /* Imágenes responsivas */
                img {
                  max-width: 100%;
                }
                /* Destacado */
                .highlight {
                  color: #3b82f6;
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="email-logo">
                    <!-- Logo o icono de la aplicación -->
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="white"/>
                      <path d="M6 12.5H18M6 7.5H18M13 17.5H18" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <h1>Verificación de Correo Electrónico</h1>
                </div>
                <div class="email-content">
                  <p>Hola,</p>
                  <p>¡Gracias por registrarte en <span class="highlight">HemoPress</span>! Para completar tu registro y tener acceso a todas las funciones de nuestra hemeroteca digital, necesitamos verificar tu correo electrónico.</p>
                  
                  <div style="text-align: center;">
                    <a href="${verificationLink}" class="email-button">Verificar mi correo electrónico</a>
                  </div>
                  
                  <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
                  <div class="email-link-container">
                    ${verificationLink}
                  </div>
                  
                  <div class="divider"></div>
                  
                  <p>Con tu cuenta verificada podrás:</p>
                  <ul>
                    <li>Acceder a nuestra colección completa de periódicos y fuentes</li>
                    <li>Guardar tus fuentes favoritas</li>
                    <li>Participar en comentarios y valoraciones</li>
                    <li>Recibir actualizaciones personalizadas</li>
                  </ul>
                  
                  <p><strong>Nota:</strong> Este enlace expirará en 24 horas por motivos de seguridad.</p>
                  <p>Si no has solicitado esta verificación, puedes ignorar este correo.</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 HemoPress - Hemeroteca Digital | Todos los derechos reservados</p>
                  <p>Este correo ha sido enviado a <span class="highlight">${email}</span></p>
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
          Subject: "Restablecimiento de Contraseña - HemoPress",
          HTMLPart: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Restablecimiento de Contraseña - HemoPress</title>
              <style>
                /* Base */
                body, html {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                /* Contenedor principal */
                .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                /* Cabecera */
                .email-header {
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white;
                  padding: 30px 20px;
                  text-align: center;
                }
                .email-header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 600;
                }
                .email-logo {
                  margin-bottom: 15px;
                }
                /* Contenido */
                .email-content {
                  padding: 30px;
                  background-color: #ffffff;
                }
                /* Botón de acción */
                .email-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                  color: white !important;
                  text-decoration: none;
                  font-weight: 600;
                  padding: 12px 30px;
                  margin: 20px 0;
                  border-radius: 6px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  transition: all 0.3s ease;
                }
                .email-button:hover {
                  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
                  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }
                /* Contenedor para enlaces */
                .email-link-container {
                  margin: 15px 0;
                  padding: 15px;
                  background-color: #f3f4f6;
                  border-left: 4px solid #f97316;
                  border-radius: 4px;
                  word-break: break-all;
                  font-size: 14px;
                  color: #4b5563;
                }
                /* Pie de página */
                .email-footer {
                  text-align: center;
                  padding: 20px;
                  color: #6b7280;
                  font-size: 12px;
                  border-top: 1px solid #e5e7eb;
                  background-color: #f9fafb;
                }
                /* Separador */
                .divider {
                  height: 1px;
                  width: 100%;
                  background-color: #e5e7eb;
                  margin: 20px 0;
                }
                /* Imágenes responsivas */
                img {
                  max-width: 100%;
                }
                /* Destacado */
                .highlight {
                  color: #f97316;
                  font-weight: 600;
                }
                /* Información de seguridad */
                .security-notice {
                  background-color: #fffbeb;
                  border-left: 4px solid #f59e0b;
                  padding: 12px;
                  margin-top: 15px;
                  border-radius: 4px;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="email-logo">
                    <!-- Logo o icono de la aplicación -->
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="white"/>
                      <path d="M6 12.5H18M6 7.5H18M13 17.5H18" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <h1>Restablecimiento de Contraseña</h1>
                </div>
                <div class="email-content">
                  <p>Hola,</p>
                  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <span class="highlight">HemoPress</span>. Haz clic en el botón a continuación para crear una nueva contraseña:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetLink}" class="email-button">Restablecer mi contraseña</a>
                  </div>
                  
                  <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
                  <div class="email-link-container">
                    ${resetLink}
                  </div>
                  
                  <div class="security-notice">
                    <p><strong>Aviso de seguridad:</strong> Este enlace expirará en 1 hora por motivos de seguridad.</p>
                    <p>Si no has solicitado este cambio de contraseña, puedes ignorar este correo. Tu cuenta seguirá estando segura.</p>
                  </div>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 HemoPress - Hemeroteca Digital | Todos los derechos reservados</p>
                  <p>Este correo ha sido enviado a <span class="highlight">${email}</span></p>
                </div>
              </div>
            </body>
            </html>
          `,
          TextPart: `Se ha solicitado un restablecimiento de contraseña para tu cuenta en HemoPress. Para crear una nueva contraseña, visita: ${resetLink} (Este enlace expirará en 1 hora por motivos de seguridad)`,
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Confirmación de Eliminación de Cuenta - HemoPress</title>
              <style>
                /* Base */
                body, html {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                /* Contenedor principal */
                .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                /* Cabecera */
                .email-header {
                  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                  color: white;
                  padding: 30px 20px;
                  text-align: center;
                }
                .email-header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 600;
                }
                .email-logo {
                  margin-bottom: 15px;
                }
                /* Contenido */
                .email-content {
                  padding: 30px;
                  background-color: #ffffff;
                }
                /* Botón de acción */
                .email-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                  color: white !important;
                  text-decoration: none;
                  font-weight: 600;
                  padding: 12px 30px;
                  margin: 20px 0;
                  border-radius: 6px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  transition: all 0.3s ease;
                }
                .email-button:hover {
                  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }
                /* Contenedor para enlaces */
                .email-link-container {
                  margin: 15px 0;
                  padding: 15px;
                  background-color: #f3f4f6;
                  border-left: 4px solid #ef4444;
                  border-radius: 4px;
                  word-break: break-all;
                  font-size: 14px;
                  color: #4b5563;
                }
                /* Pie de página */
                .email-footer {
                  text-align: center;
                  padding: 20px;
                  color: #6b7280;
                  font-size: 12px;
                  border-top: 1px solid #e5e7eb;
                  background-color: #f9fafb;
                }
                /* Separador */
                .divider {
                  height: 1px;
                  width: 100%;
                  background-color: #e5e7eb;
                  margin: 20px 0;
                }
                /* Imágenes responsivas */
                img {
                  max-width: 100%;
                }
                /* Destacado */
                .highlight {
                  color: #ef4444;
                  font-weight: 600;
                }
                /* Advertencia */
                .warning-box {
                  background-color: #fef2f2;
                  border-left: 4px solid #ef4444;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .warning-title {
                  color: #dc2626;
                  font-weight: bold;
                  margin-bottom: 10px;
                  display: flex;
                  align-items: center;
                }
                .warning-icon {
                  margin-right: 8px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="email-logo">
                    <!-- Logo o icono de la aplicación -->
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="white"/>
                      <path d="M6 12.5H18M6 7.5H18M13 17.5H18" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <h1>Confirmación de Eliminación de Cuenta</h1>
                </div>
                <div class="email-content">
                  <p>Hola,</p>
                  <p>Hemos recibido una solicitud para eliminar tu cuenta de <span class="highlight">HemoPress</span>.</p>
                  
                  <div class="warning-box">
                    <div class="warning-title">
                      <span class="warning-icon">⚠️</span>
                      <span>ADVERTENCIA</span>
                    </div>
                    <p>Esta acción <strong>no se puede deshacer</strong>. Si confirmas la eliminación de tu cuenta:</p>
                    <ul>
                      <li>Todos tus datos personales serán eliminados</li>
                      <li>Perderás acceso a tu historial y actividad</li>
                      <li>Tus comentarios y valoraciones se eliminarán</li>
                      <li>No podrás recuperar tu cuenta en el futuro</li>
                    </ul>
                  </div>
                  
                  <p>Si estás seguro de querer eliminar tu cuenta, haz clic en el botón a continuación para confirmar:</p>
                  
                  <div style="text-align: center;">
                    <a href="${deletionLink}" class="email-button">Confirmar eliminación de cuenta</a>
                  </div>
                  
                  <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
                  <div class="email-link-container">
                    ${deletionLink}
                  </div>
                  
                  <div class="divider"></div>
                  
                  <p><strong>Nota:</strong> Si no has solicitado esta eliminación o has cambiado de opinión, simplemente ignora este correo. Tu cuenta seguirá activa.</p>
                  <p>Este enlace expirará en 24 horas por motivos de seguridad.</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 HemoPress - Hemeroteca Digital | Todos los derechos reservados</p>
                  <p>Este correo ha sido enviado a <span class="highlight">${email}</span></p>
                </div>
              </div>
            </body>
            </html>
          `,
          TextPart: `Hemos recibido una solicitud para eliminar tu cuenta de HemoPress. Para confirmar esta acción, visita el siguiente enlace: ${deletionLink} (Este enlace expirará en 24 horas por motivos de seguridad). ADVERTENCIA: Esta acción no se puede deshacer. Toda tu información y contenido se eliminará permanentemente.`,
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