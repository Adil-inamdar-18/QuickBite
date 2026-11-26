import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";

function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-white border-t border-slate-200/80 mt-16 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2.5 cursor-pointer mb-3"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FF4D2D] text-white flex items-center justify-center">
                <FaUtensils size={16} />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Quick<span className="text-[#FF4D2D]">Bite</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Freshly prepared meals from your favorite neighborhood restaurants, delivered hot and fast to your doorstep with real-time tracking.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <button onClick={() => navigate("/")} className="hover:text-[#FF4D2D] transition cursor-pointer">
                  Browse Restaurants
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/cart")} className="hover:text-[#FF4D2D] transition cursor-pointer">
                  Your Cart
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/my-orders")} className="hover:text-[#FF4D2D] transition cursor-pointer">
                  Order History
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Account & Help
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <button onClick={() => navigate("/profile")} className="hover:text-[#FF4D2D] transition cursor-pointer">
                  Profile & Addresses
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/support")} className="hover:text-[#FF4D2D] transition cursor-pointer">
                  Help & Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} QuickBite Technologies. All rights reserved.</p>
          <p>Secure payments powered by Razorpay • Live maps by OpenStreetMap</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
