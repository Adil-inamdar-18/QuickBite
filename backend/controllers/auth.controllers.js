import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import genToken, { getCookieOptions } from "../utils/token.js";
import { sendOtpMail } from "../utils/mail.js";
import {
  generateOtp,
  hashOtp,
  MAX_OTP_ATTEMPTS,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  verifyOtpHash,
} from "../utils/otp.js";
import { verifyFirebaseIdToken } from "../utils/firebaseVerify.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

const PUBLIC_ROLES = new Set(["user", "owner", "deliveryBoy"]);

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  delete obj.resetOtpHash;
  delete obj.otpAttempts;
  delete obj.otpExpires;
  delete obj.otpLastSentAt;
  delete obj.isOtpVerified;
  return obj;
};

export const signUp = asyncHandler(async (req, res) => {
  const { fullName, email, password, mobile, role = "user" } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password || !mobile) {
    throw new ApiError(400, "Full name, email, mobile, and password are required");
  }
  if (!PUBLIC_ROLES.has(role)) {
    throw new ApiError(400, "Invalid role selected");
  }
  if (String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
  const cleanMobile = String(mobile).replace(/\D/g, "");
  if (cleanMobile.length < 10 || cleanMobile.length > 15) {
    throw new ApiError(400, "Mobile number must be 10 to 15 digits");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    role,
    mobile: cleanMobile,
    password: hashedPassword,
  });

  const token = genToken(user._id, user.role);
  res.cookie("token", token, getCookieOptions());

  return res.status(201).json({
    success: true,
    user: sanitizeUser(user),
  });
});

export const signIn = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.password) {
    throw new ApiError(400, "This account uses Google Sign-In. Please sign in with Google.");
  }
  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been suspended. Please contact support.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = genToken(user._id, user.role);
  res.cookie("token", token, getCookieOptions());

  return res.status(200).json({
    success: true,
    user: sanitizeUser(user),
  });
});

export const signOut = asyncHandler(async (req, res) => {
  const opts = getCookieOptions();
  res.clearCookie("token", {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
  });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+resetOtpHash");
  if (!user) {
    throw new ApiError(404, "No account found with this email");
  }

  if (
    user.otpLastSentAt &&
    Date.now() - new Date(user.otpLastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    throw new ApiError(429, "Please wait 30 seconds before requesting another OTP");
  }

  const otp = generateOtp(6);
  user.resetOtpHash = hashOtp(otp);
  user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  user.isOtpVerified = false;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  await sendOtpMail(normalizedEmail, otp);

  return res.status(200).json({
    success: true,
    message: "Verification OTP sent to your email",
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email?.trim() || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+resetOtpHash");
  if (!user || !user.resetOtpHash || !user.otpExpires) {
    throw new ApiError(400, "No active OTP request found. Please request a new OTP.");
  }

  if (user.otpExpires.getTime() < Date.now()) {
    user.resetOtpHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    user.resetOtpHash = undefined;
    user.otpExpires = undefined;
    await user.save();
    throw new ApiError(429, "Maximum OTP attempts exceeded. Please request a new OTP.");
  }

  const isValid = verifyOtpHash(otp, user.resetOtpHash);
  if (!isValid) {
    user.otpAttempts += 1;
    await user.save();
    const remaining = MAX_OTP_ATTEMPTS - user.otpAttempts;
    throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  user.isOtpVerified = true;
  user.resetOtpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email?.trim() || !newPassword) {
    throw new ApiError(400, "Email and new password are required");
  }
  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isOtpVerified) {
    throw new ApiError(400, "OTP verification is required before resetting password");
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.isOtpVerified = false;
  user.resetOtpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, mobile, role = "user" } = req.body;
  if (!idToken) {
    throw new ApiError(400, "Google authentication token is required");
  }

  const payload = await verifyFirebaseIdToken(idToken);
  const email = payload.email.toLowerCase();
  const fullName = payload.name || email.split("@")[0];
  const avatar = payload.picture || "";

  let user = await User.findOne({ email });
  if (user) {
    if (user.isBlocked) {
      throw new ApiError(403, "Your account has been suspended. Please contact support.");
    }
    if (!user.avatar && avatar) {
      user.avatar = avatar;
      await user.save();
    }
  } else {
    if (!PUBLIC_ROLES.has(role)) {
      throw new ApiError(400, "Invalid role selected");
    }
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "") : "";
    if (!cleanMobile || cleanMobile.length < 10) {
      throw new ApiError(400, "Please enter a valid 10-digit mobile number to complete registration");
    }
    user = await User.create({
      fullName,
      email,
      mobile: cleanMobile,
      role,
      avatar,
    });
  }

  const token = genToken(user._id, user.role);
  res.cookie("token", token, getCookieOptions());

  return res.status(200).json({
    success: true,
    user: sanitizeUser(user),
  });
});
