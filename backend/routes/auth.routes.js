import express from "express";
import {
  googleAuth,
  resetPassword,
  sendOtp,
  signIn,
  signOut,
  signUp,
  verifyOtp,
} from "../controllers/auth.controllers.js";
import { authRateLimiter, otpRateLimiter } from "../middlewares/rateLimiter.js";

const authRouter = express.Router();

authRouter.post("/signup", authRateLimiter, signUp);
authRouter.post("/signin", authRateLimiter, signIn);
authRouter.get("/signout", signOut);
authRouter.post("/send-otp", otpRateLimiter, sendOtp);
authRouter.post("/verify-otp", otpRateLimiter, verifyOtp);
authRouter.post("/reset-password", authRateLimiter, resetPassword);
authRouter.post("/google-auth", authRateLimiter, googleAuth);

export default authRouter;
