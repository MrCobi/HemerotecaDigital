import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY!, // API Key
  process.env.MAILJET_SECRET_KEY! // Secret Key
);

export const sendEmailVerification = async (email: string, token: string) => {
  const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

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
          Subject: "Verify your email",
          HTMLPart: `
            <h1>Email Verification</h1>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationLink}" 
               style="
                   background-color: #0070f3;
                   color: white;
                   padding: 12px 24px;
                   text-decoration: none;
                   border-radius: 4px;
                   display: inline-block;
               ">
                Verify Email
            </a>
            <p>Or copy this link:</p>
            <code>${verificationLink}</code>
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