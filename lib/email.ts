import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Allowed email domains for registration
export const ALLOWED_EMAIL_DOMAINS = ["mikeng.io", "nortrix.io"];

/**
 * Check if an email domain is allowed for registration
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email with 6-digit code
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Downloader <noreply@nortrix.io>",
      to: email,
      subject: "Verify your Downloader account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 32px;">
                        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                          Verify your email
                        </h1>
                        <p style="margin: 0 0 24px; font-size: 16px; color: #52525b; line-height: 1.5; text-align: center;">
                          ${name ? `Hi ${name},` : "Hi,"}<br>
                          Enter this code to complete your registration:
                        </p>
                        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
                          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #18181b; font-family: monospace;">
                            ${code}
                          </span>
                        </div>
                        <p style="margin: 0 0 8px; font-size: 14px; color: #71717a; text-align: center;">
                          This code will expire in 15 minutes.
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                          If you didn't request this, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
                        <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                          Downloader - Self-hosted media downloader
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
