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

const ROLE_OPTIONS = [
  { id: "user", label: "Customer" },
  { id: "owner", label: "Restaurant" },
  { id: "deliveryBoy", label: "Delivery" },
];

function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (mobile.replace(/\D/g, "").length < 10) {
      return setError("Please enter a valid 10-digit mobile number.");
    }

    setLoading(true);
    try {
      const result = await api.post("/api/auth/signup", {
        fullName,
        email,
        password,
        mobile,
        role,
      });
      dispatch(setUserData(result.data.user));
      toast.success("Account created successfully!");
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    if (mobile.replace(/\D/g, "").length < 10) {
      return setError("Please enter your 10-digit mobile number before continuing with Google.");
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post("/api/auth/google-auth", {
        idToken,
        role,
        mobile,
      });
      dispatch(setUserData(data.user));
      toast.success("Signed up with Google!");
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Google sign up failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FB] flex items-center justify-center p-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 w-full max-w-md p-8">
        <div
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2.5 mb-5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FF4D2D] text-white flex items-center justify-center">
            <FaUtensils size={16} />
          </div>
          <span className="text-2xl font-extrabold text-slate-900">
            Quick<span className="text-[#FF4D2D]">Bite</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">
          Join QuickBite as a customer, restaurant owner, or delivery partner
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              I want to join as
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    role === r.id
                      ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100"
              placeholder="Aarav Sharma"
              onChange={(e) => setFullName(e.target.value)}
              value={fullName}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
          </div>

          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-slate-700 mb-1">
              Mobile Number
            </label>
            <input
              id="mobile"
              type="tel"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100"
              placeholder="9876543210"
              onChange={(e) => setMobile(e.target.value)}
              value={mobile}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#FF4D2D] focus:ring-2 focus:ring-orange-100"
                placeholder="At least 6 characters"
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

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white font-semibold rounded-xl py-2.5 transition flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {loading ? <ClipLoader color="white" size={18} /> : "Create Account"}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <FcGoogle size={20} />
          <span>Sign Up with Google</span>
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
