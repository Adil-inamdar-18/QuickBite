import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegEye, FaRegEyeSlash, FaUtensils } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { ClipLoader } from "react-spinners";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { auth } from "../../firebase";
import { api, getErrorMessage } from "../api/client";
import { setUserData } from "../redux/userslice";

function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) {
      return setErr("Please enter both email and password.");
    }
    setLoading(true);
    try {
      const result = await api.post("/api/auth/signin", { email, password });
      dispatch(setUserData(result.data.user));
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      setErr(getErrorMessage(error, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErr("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post("/api/auth/google-auth", { idToken });
      dispatch(setUserData(data.user));
      toast.success("Signed in with Google!");
      navigate("/");
    } catch (error) {
      setErr(getErrorMessage(error, "Google Sign-In failed. Please sign up first if you are a new user."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 w-full max-w-md p-8">
        <div
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2.5 mb-6 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FF4D2D] text-white flex items-center justify-center">
            <FaUtensils size={16} />
          </div>
          <span className="text-2xl font-extrabold text-slate-900">
            Quick<span className="text-[#FF4D2D]">Bite</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to order from top restaurants near you
        </p>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100 transition"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100 transition"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </button>
            </div>
          </div>

          {err && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white font-semibold rounded-xl py-2.5 transition flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {loading ? <ClipLoader color="white" size={18} /> : "Sign In"}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <FcGoogle size={20} />
          <span>Sign In with Google</span>
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          New to QuickBite?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
