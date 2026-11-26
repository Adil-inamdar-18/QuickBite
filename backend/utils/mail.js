import nodemailer from "nodemailer";

const createTransporter = () => {
  if (!process.env.EMAIL || !process.env.PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });
};

export const sendOtpMail = async (to, otp) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[DEV MAIL] Password reset OTP requested for ${to} (EMAIL/PASS env not configured)`);
    return { delivered: false, reason: "SMTP credentials not configured" };
  }

  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "QuickBite - Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ff4d2d; margin: 0 0 12px;">QuickBite Password Reset</h2>
        <p style="color: #444;">Use the one-time verification code below to reset your password:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px 20px; background: #fff5f2; color: #ff4d2d; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #777; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
  return { delivered: true };
};

export const sendDeliveryOtpMail = async (user, otp, orderNumber = "") => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[DEV MAIL] Delivery OTP requested for ${user?.email} (EMAIL/PASS env not configured)`);
    return { delivered: false, reason: "SMTP credentials not configured" };
  }

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: user.email,
    subject: `QuickBite Delivery OTP ${orderNumber ? `(${orderNumber})` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ff4d2d; margin: 0 0 12px;">QuickBite Delivery Verification</h2>
        <p style="color: #444;">Share this OTP with your delivery partner to confirm receipt of your order:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px 20px; background: #fff5f2; color: #ff4d2d; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #777; font-size: 13px;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
  return { delivered: true };
};
