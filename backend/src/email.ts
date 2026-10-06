import { Resend } from 'resend';
import { getConfig } from './config/env.js';
import { logger } from './logging/logger.js';

/**
 * Print OTP to the process terminal for local development.
 * Uses console directly so the redacting logger cannot strip the code.
 */
function printDevOtpToTerminal(email: string, otp: string): void {
  const line = '─'.repeat(48);
  // eslint-disable-next-line no-console
  console.log(`\n${line}`);
  // eslint-disable-next-line no-console
  console.log('  DEV OTP (email not sent)');
  // eslint-disable-next-line no-console
  console.log(`  To:   ${email}`);
  // eslint-disable-next-line no-console
  console.log(`  Code: ${otp}`);
  // eslint-disable-next-line no-console
  console.log(`${line}\n`);
}

/**
 * Send OTP email.
 * In development/test (devOtpToConsole), the code is printed to the terminal and no email is sent.
 * OTP values are never written through the structured logger.
 */
export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; simulated?: boolean }> {
  const config = getConfig();

  if (config.devOtpToConsole) {
    printDevOtpToTerminal(email, otp);
    if (process.env.EXPOSE_OTP_FOR_TESTS === 'true') {
      (globalThis as { __LAST_OTP_FOR_TESTS?: { email: string; otp: string } }).__LAST_OTP_FOR_TESTS =
        { email, otp };
    }
    logger.info('OTP delivered to terminal (dev mode)', {
      destinationDomain: email.includes('@') ? email.split('@')[1] : 'unknown',
    });
    return { success: true, simulated: true };
  }

  if (!config.resendApiKey) {
    if (config.env === 'production') {
      logger.error('RESEND_API_KEY missing in production; refusing to send OTP');
      return { success: false };
    }
    // Fallback when console delivery is disabled but no Resend key is configured
    printDevOtpToTerminal(email, otp);
    if (process.env.EXPOSE_OTP_FOR_TESTS === 'true') {
      (globalThis as { __LAST_OTP_FOR_TESTS?: { email: string; otp: string } }).__LAST_OTP_FOR_TESTS =
        { email, otp };
    }
    logger.info('OTP email simulated (no RESEND_API_KEY)', {
      destinationDomain: email.includes('@') ? email.split('@')[1] : 'unknown',
    });
    return { success: true, simulated: true };
  }

  const resend = new Resend(config.resendApiKey);

  try {
    let fromField = config.resendFromEmail;
    if (!fromField.includes('<')) {
      fromField = `Feedback Desk AI <${fromField}>`;
    }

    const { data, error } = await resend.emails.send({
      from: fromField,
      to: [email],
      subject: 'Your Feedback Desk verification code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Feedback Desk AI</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Email Verification Code</p>
          </div>
          <div style="padding: 24px; background-color: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9;">
            <p style="font-size: 15px; color: #334155; margin: 0 0 12px 0;">Use the following 6-digit code to complete your sign-in:</p>
            <div style="font-size: 38px; font-weight: bold; letter-spacing: 8px; color: #0f172a; margin: 16px 0; font-family: monospace;">${otp}</div>
            <p style="font-size: 13px; color: #64748b; margin: 12px 0 0 0;">This code is valid for <strong>10 minutes</strong>.</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">If you did not request this verification code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend email send failed', { providerError: true });
      return { success: false };
    }

    logger.info('OTP email sent', { messageId: data?.id ? 'present' : 'missing' });
    return { success: true };
  } catch (err) {
    logger.error('Resend exception', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    return { success: false };
  }
}
