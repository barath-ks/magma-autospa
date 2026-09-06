import nodemailer from "nodemailer";

/**
 * Creates and returns a Nodemailer transporter instance using environment variables.
 */
export function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  const cleanUser = user.trim();
  // Strip any accidental spaces copied into the 16-character App Password
  const cleanPass = pass.trim().replace(/\s+/g, "");

  // If using Gmail, configure with Gmail preset or standard host/port
  if (host.includes("gmail") || host === "smtp.gmail.com") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
    });
  }

  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
  });
}

/**
 * Options for customizing the OTP verification email.
 */
export interface SendOtpEmailOptions {
  purpose?: "password_reset" | "loyalty_claim" | "general";
  recipientName?: string;
  offerName?: string;
  pointsRequired?: number;
}

/**
 * Dispatches a 6-digit verification code to the recipient's email address.
 * Wrapped in try/catch to ensure errors are caught and logged, falling back to [DEV OTP FALLBACK].
 *
 * @param email - Recipient's email address
 * @param otp - 6-digit OTP string
 * @param options - Custom options such as purpose (loyalty_claim, password_reset), recipientName, offer details
 * @returns boolean indicating if email transmission succeeded
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  options: SendOtpEmailOptions = {}
): Promise<boolean> {
  const user = process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || user || "no-reply@magma-autospa.com";
  const purpose = options.purpose || "password_reset";
  const nameGreeting = options.recipientName ? `Hello <strong>${options.recipientName}</strong>,<br /><br />` : "";

  let subject = `Your Magma Autospa Verification Code: ${otp}`;
  let subheader = "Security & Access Recovery";
  let bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px;">
      ${nameGreeting}You have requested a one-time verification code to reset your account password.
    </p>
  `;
  let textContent = `Your Magma Autospa verification code is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request this, please disregard this email.`;

  if (purpose === "loyalty_claim") {
    subject = `Magma Autospa - Loyalty Redemption Code: ${otp}`;
    subheader = "Loyalty Rewards & Redemptions";
    const offerDetails = options.offerName
      ? `redeeming <strong>${options.pointsRequired ? `${options.pointsRequired} points` : "loyalty points"}</strong> for <strong>${options.offerName}</strong>`
      : "claiming a loyalty reward";

    bodyHtml = `
      <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px;">
        ${nameGreeting}You are currently ${offerDetails} at Magma Autospa.<br /><br />
        Please provide the 6-digit verification code below to your attending staff member or service advisor to authorize this redemption:
      </p>
    `;
    textContent = `Your Magma Autospa loyalty redemption code is: ${otp}\n\nPlease share this code with the attending staff member to complete your reward. This code expires in 10 minutes.`;
  }

  try {
    const transporter = getMailTransporter();

    if (!transporter) {
      console.warn("[EMAIL WARNING] SMTP credentials (SMTP_USER / SMTP_PASS) not fully configured.");
      console.log(`[DEV OTP FALLBACK] Recipient: ${email} | Purpose: ${purpose} | Verification Code: ${otp}`);
      return false;
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #0f1115; color: #f3f4f6; border: 1px solid #232832; border-left: 4px solid #B87333;">
        <h1 style="color: #ffffff; font-size: 22px; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;">Magma Autospa</h1>
        <p style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">${subheader}</p>
        
        ${bodyHtml}
        
        <div style="background-color: #171a21; border: 1px solid #2f3542; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #B87333;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">
          • This code is valid for <strong>10 minutes</strong>.<br />
          • If you did not initiate this request, please contact your branch manager or system administrator immediately.
        </p>
        
        <hr style="border: none; border-top: 1px solid #232832; margin: 24px 0;" />
        <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
          Magma Autospa Operations Platform
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `Magma Autospa <${from}>`,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EMAIL SUCCESS] OTP email (${purpose}) dispatched to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Failed to send OTP email to ${email}:`, error?.message || error);
    if (error?.code === "EAUTH" || error?.responseCode === 535 || String(error?.message).includes("535")) {
      console.warn("[SMTP DIAGNOSTIC] Gmail rejected authentication (535 Bad Credentials). Ensure SMTP_USER is your full Gmail address and SMTP_PASS is a 16-character App Password generated at https://myaccount.google.com/apppasswords (with 2-Step Verification enabled).");
    }
    console.log(`[DEV OTP FALLBACK] Email delivery failed. Recipient: ${email} | Purpose: ${purpose} | Verification Code: ${otp}`);
    return false;
  }
}

/**
 * Dispatches a confirmation receipt email upon successful loyalty reward redemption.
 */
export async function sendRedemptionConfirmationEmail(
  email: string,
  name: string,
  points: number,
  offerName: string
): Promise<boolean> {
  const user = process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || user || "no-reply@magma-autospa.com";

  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      console.log(`[DEV EMAIL FALLBACK] Redemption receipt for ${name} (${email}): Redeemed ${points} pts for ${offerName}`);
      return false;
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #0f1115; color: #f3f4f6; border: 1px solid #232832; border-left: 4px solid #D4AF37;">
        <h1 style="color: #ffffff; font-size: 22px; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;">Magma Autospa</h1>
        <p style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">Reward Redemption Receipt</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px;">
          Hello <strong>${name}</strong>,<br /><br />
          You have successfully redeemed <strong>${points} points</strong> for <strong>${offerName}</strong> at Magma Autospa.
        </p>
        
        <div style="background-color: #171a21; border: 1px solid #2f3542; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Reward Claimed</div>
          <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-top: 4px;">${offerName}</div>
          <div style="font-size: 13px; color: #D4AF37; margin-top: 2px;">-${points} Points Deducted</div>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">
          Thank you for choosing Magma Autospa!
        </p>
        
        <hr style="border: none; border-top: 1px solid #232832; margin: 24px 0;" />
        <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
          Magma Autospa Operations Platform
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `Magma Autospa <${from}>`,
      to: email,
      subject: `Magma Autospa - Reward Redeemed: ${offerName}`,
      text: `Hello ${name}, you have successfully redeemed ${points} points for ${offerName} at Magma Autospa. Thank you!`,
      html: htmlContent,
    });
    return true;
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Failed to send redemption receipt to ${email}:`, error?.message || error);
    return false;
  }
}
