import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendOTPEmail(email: string, otp: string) {
    console.log(`\n==========================================`);
    console.log(`[OTP VERIFICATION] Code for ${email}: ${otp}`);
    console.log(`==========================================\n`);

    if (!resend) {
        console.log('[Resend] RESEND_API_KEY is not set. OTP code logged to console.');
        return { success: true, simulated: true };
    }

    try {
        let fromField = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        if (!fromField.includes('<')) {
            fromField = `Feedback Desk AI <${fromField}>`;
        }

        const { data, error } = await resend.emails.send({
            from: fromField,
            to: [email],
            subject: `${otp} is your verification code`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">Feedback Desk AI</h2>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Email Verification Code</p>
                    </div>
                    <div style="padding: 24px; background-color: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9;">
                        <p style="font-size: 15px; color: #334155; margin: 0 0 12px 0;">Use the following 6-digit code to complete your registration:</p>
                        <div style="font-size: 38px; font-weight: bold; letter-spacing: 8px; color: #0f172a; margin: 16px 0; font-family: monospace;">${otp}</div>
                        <p style="font-size: 13px; color: #64748b; margin: 12px 0 0 0;">This code is valid for <strong>10 minutes</strong>.</p>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">If you did not request this verification code, please ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('[Resend Error]:', error);
            return { success: false, error };
        }

        console.log('[Resend Success]: Email sent successfully, ID:', data?.id);
        return { success: true, data };
    } catch (err: any) {
        console.error('[Resend Exception]:', err);
        return { success: false, error: err.message };
    }
}
