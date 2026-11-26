import React from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaShoppingBag } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CartItemCard from "../component/CartItemCard";
import EmptyState from "../component/EmptyState";
import Nav from "../component/Nav";
import Footer from "../component/Footer";
import { clearCart } from "../redux/userslice";

function CartPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cartItems, totalAmount, cartShopName, userData } = useSelector((state) => state.user);

  const deliveryFee = totalAmount >= 499 || totalAmount === 0 ? 0 : 40;
  const taxAmount = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + deliveryFee + taxAmount;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#FF4D2D] cursor-pointer"
            >
              <IoIosArrowRoundBack size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
              {cartShopName && cartItems.length > 0 && (
                <p className="text-xs text-slate-500">Ordering from {cartShopName}</p>
              )}
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={() => dispatch(clearCart())}
              className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Clear Cart
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <EmptyState
            icon={<FaShoppingBag />}
            title="Your cart is empty"
            subtitle="Explore delicious dishes from restaurants near you and add them to your cart."
            actionLabel="Browse Food"
            onAction={() => navigate("/")}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              {cartItems.map((item) => (
                <CartItemCard data={item} key={item.id} />
              ))}
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Bill Summary
              </h2>
              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Taxes (5% GST)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">₹{taxAmount}</span>
                </div>
              </div>

              {totalAmount < 499 && (
                <p className="text-xs bg-orange-50 text-[#FF4D2D] px-3 py-2 rounded-xl font-medium">
                  Add ₹{499 - totalAmount} more for free delivery!
                </p>
              )}

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-900">To Pay</span>
                <span className="text-xl font-extrabold text-[#FF4D2D] tabular-nums">
                  ₹{grandTotal}
                </span>
              </div>

              <button
                onClick={() => navigate(userData ? "/checkout" : "/signin")}
                className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white py-3 rounded-xl font-semibold transition cursor-pointer"
              >
                {userData ? "Proceed to Checkout" : "Sign In to Checkout"}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CartPage;
