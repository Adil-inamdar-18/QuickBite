import React, { useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../api/client";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/api/auth/send-otp", { email });
      toast.success("Verification OTP sent to your email");
      setStep(2);
    } catch (error) {
      setErr(getErrorMessage(error, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/api/auth/verify-otp", { email, otp });
      toast.success("OTP verified");
      setStep(3);
    } catch (error) {
      setErr(getErrorMessage(error, "Invalid or expired OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPassword.length < 6) {
      return setErr("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setErr("Passwords do not match.");
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, newPassword });
      toast.success("Password reset successfully! Please sign in.");
      navigate("/signin");
    } catch (error) {
      setErr(getErrorMessage(error, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center min-h-screen p-4 bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <IoIosArrowRoundBack size={26} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6 pl-1">
          Step {step} of 3 •{" "}
          {step === 1
            ? "Enter your registered email"
            : step === 2
              ? "Enter the 6-digit OTP"
              : "Choose a strong new password"}
        </p>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D]"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </div>
            {err && <p className="text-xs font-medium text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold rounded-xl py-2.5 bg-[#FF4D2D] hover:bg-[#E63E20] text-white transition cursor-pointer flex justify-center"
            >
              {loading ? <ClipLoader size={18} color="white" /> : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="reset-otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                6-Digit OTP
              </label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-center tracking-[0.4em] font-semibold text-base focus:outline-none focus:border-[#FF4D2D]"
                placeholder="••••••"
                onChange={(e) => setOtp(e.target.value)}
                value={otp}
                required
              />
            </div>
            {err && <p className="text-xs font-medium text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold rounded-xl py-2.5 bg-[#FF4D2D] hover:bg-[#E63E20] text-white transition cursor-pointer flex justify-center"
            >
              {loading ? <ClipLoader size={18} color="white" /> : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs font-semibold text-slate-500 hover:text-[#FF4D2D] cursor-pointer"
            >
              Change email or resend OTP
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D]"
                placeholder="Minimum 6 characters"
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D]"
                placeholder="Re-enter password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
                required
              />
            </div>
            {err && <p className="text-xs font-medium text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold rounded-xl py-2.5 bg-[#FF4D2D] hover:bg-[#E63E20] text-white transition cursor-pointer flex justify-center"
            >
              {loading ? <ClipLoader size={18} color="white" /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
