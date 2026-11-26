import crypto from "crypto";

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const DELIVERY_OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

export const generateOtp = (digits = 6) => {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return String(crypto.randomInt(min, max));
};

export const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
};

export const verifyOtpHash = (plainOtp, expectedHash) => {
  if (!plainOtp || !expectedHash) return false;
  const candidate = Buffer.from(hashOtp(plainOtp), "hex");
  const target = Buffer.from(expectedHash, "hex");
  if (candidate.length !== target.length) return false;
  return crypto.timingSafeEqual(candidate, target);
};
