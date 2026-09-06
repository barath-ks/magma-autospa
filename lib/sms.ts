/**
 * SMS Dispatcher supporting Fast2SMS (India Quick SMS) with Twilio and local Mock/Dev Fallback.
 */

export async function sendSMSRedemption(phone: string, name: string, points: number, offerName: string): Promise<boolean> {
  const messageBody = `Hi ${name}, you just successfully redeemed ${points} points for ${offerName} at Magma Autospa!`;
  return sendSMS(phone, messageBody);
}

export async function sendSMSPasswordResetOTP(phone: string, otp: string): Promise<boolean> {
  const messageBody = `Your Magma Autospa password reset verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  return sendSMS(phone, messageBody, otp);
}

export { sendOtpEmail, sendRedemptionConfirmationEmail } from "./email";

/**
 * Normalizes phone numbers to a clean 10-digit Indian mobile format for Fast2SMS.
 * Strips non-digits, leading zeros, +91 or 91 country codes.
 */
function cleanIndianPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

/**
 * Dispatch SMS via Fast2SMS (bulkV2 route 'q') -> Twilio -> Mock Mode fallback.
 */
async function sendSMS(phone: string, messageBody: string, otpCode?: string): Promise<boolean> {
  const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  // 1. FAST2SMS DISPATCH (Priority for India mobile numbers)
  if (fast2smsApiKey) {
    const cleanPhone = cleanIndianPhoneNumber(phone);

    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsApiKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: messageBody,
          flash: 0,
          numbers: cleanPhone,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { raw: responseText };
      }

      if (response.ok && data.return === true) {
        console.log(`[FAST2SMS SUCCESS] SMS dispatched to ${cleanPhone}:`, data.message || "Sent");
        return true;
      } else {
        console.error(`[FAST2SMS ERROR] HTTP ${response.status} - Code ${data.status_code || "N/A"}: ${data.message || responseText}`);
        if (otpCode) {
          console.log(`[DEV OTP FALLBACK] Fast2SMS delivery failed. Use this verification code: ${otpCode}`);
        }
      }
    } catch (err) {
      console.error("[FAST2SMS EXCEPTION] Network or request error:", err);
      if (otpCode) {
        console.log(`[DEV OTP FALLBACK] Fast2SMS error. Use this verification code: ${otpCode}`);
      }
    }
  }

  // 2. TWILIO DISPATCH (Secondary provider fallback)
  if (twilioSid && twilioToken && twilioNumber) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams({
        To: phone.startsWith("+") ? phone : `+91${cleanIndianPhoneNumber(phone)}`,
        From: twilioNumber,
        Body: messageBody,
      });

      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

      const twilioRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (twilioRes.ok) {
        console.log(`[TWILIO SUCCESS] SMS dispatched to ${phone}`);
        return true;
      } else {
        const errText = await twilioRes.text();
        console.error("[TWILIO ERROR] Twilio failed:", twilioRes.status, errText);
      }
    } catch (error) {
      console.error("[TWILIO ERROR] Network error:", error);
    }
  }

  // 3. MOCK / CONSOLE FALLBACK (When providers fail or are not configured)
  console.log("[MOCK SMS] Intended recipient:", phone);
  console.log("[MOCK SMS] Message body:", messageBody);
  if (otpCode) {
    console.log(`[DEV OTP FALLBACK] Verification code: ${otpCode}`);
  }

  return false;
}
