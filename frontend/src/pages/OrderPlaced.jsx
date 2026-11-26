import React from "react";
import { FaCircleCheck } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import Nav from "../component/Nav";

function OrderPlaced() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const order = state?.order;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />
      <main className="flex-1 flex items-center justify-center p-4 pt-24">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <FaCircleCheck size={38} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            Order Confirmed!
          </h1>
          {order?.orderNumber && (
            <p className="text-xs font-bold uppercase tracking-wider text-[#FF4D2D] mb-2">
              Order #{order.orderNumber}
            </p>
          )}
          <p className="text-sm text-slate-500 mb-6">
            Thank you for ordering with QuickBite. The restaurant has received your order and will begin preparing it shortly.
          </p>

          {order && (
            <div className="bg-[#F8F9FB] rounded-2xl p-4 text-left text-xs text-slate-600 space-y-1.5 mb-6 border border-slate-100">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="font-bold text-slate-900 uppercase">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid / Payable</span>
                <span className="font-bold text-slate-900">₹{order.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Address</span>
                <span className="font-medium text-slate-800 truncate max-w-[60%]">
                  {order.deliveryAddress?.text}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {order?._id && (
              <button
                onClick={() => navigate(`/track-order/${order._id}`)}
                className="flex-1 bg-[#FF4D2D] hover:bg-[#E63E20] text-white py-3 rounded-xl font-semibold text-sm transition cursor-pointer"
              >
                Track Order
              </button>
            )}
            <button
              onClick={() => navigate("/my-orders")}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              My Orders
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default OrderPlaced;
