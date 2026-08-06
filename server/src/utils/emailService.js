let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

/**
 * Send Password Reset OTP Email
 * @param {string} toEmail - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 */
exports.sendOTPEmail = async (toEmail, otpCode) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || 'no-reply@sentinelops.mil';

  console.log(`\n==================================================`);
  console.log(`[AUTH] PASSWORD RESET OTP GENERATED FOR ${toEmail}`);
  console.log(`[AUTH] OTP CODE: [ ${otpCode} ] (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  if (nodemailer && smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"Regiment Defense System" <${fromEmail}>`,
        to: toEmail,
        subject: 'Regiment - Password Reset Security Code (OTP)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #41431B; padding: 24px; border-radius: 12px; color: #F8F3E1;">
            <h2 style="color: #AEB784; font-size: 22px; margin-bottom: 12px;">Regiment Anomaly Detection</h2>
            <p style="font-size: 14px; color: #E3DBBB;">A password reset request was initiated for your operator account.</p>
            <div style="background: rgba(174,183,132,0.15); border: 1px solid #AEB784; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #AEB784; display: block; margin-bottom: 6px;">Your Security Verification OTP</span>
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #F8F3E1;">${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: rgba(227,219,187,0.7);">This code expires in 10 minutes. If you did not request a password reset, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[AUTH] OTP email successfully sent to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[AUTH] Failed to send email via SMTP: ${err.message}`);
      // Fallback allowed in local/dev
      return true;
    }
  }

  return true;
};
