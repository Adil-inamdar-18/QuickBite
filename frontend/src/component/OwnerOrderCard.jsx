import React, { useState } from "react";
import { IoCallSharp } from "react-icons/io5";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { updateOrderStatus } from "../redux/userslice";

const NEXT_ACTIONS = {
  pending: [
    { status: "confirmed", label: "Accept Order", style: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { status: "rejected", label: "Reject", style: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" },
  ],
  confirmed: [
    { status: "preparing", label: "Start Preparing", style: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    { status: "cancelled", label: "Cancel", style: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" },
  ],
  preparing: [
    { status: "ready", label: "Mark Ready", style: "bg-purple-600 hover:bg-purple-700 text-white" },
    { status: "out of delivery", label: "Dispatch Delivery", style: "bg-[#FF4D2D] hover:bg-[#E63E20] text-white" },
  ],
  ready: [
    { status: "out of delivery", label: "Dispatch Delivery", style: "bg-[#FF4D2D] hover:bg-[#E63E20] text-white" },
  ],
};

function OwnerOrderCard({ data }) {
  const [availableBoys, setAvailableBoys] = useState([]);
  const [updating, setUpdating] = useState(false);
  const dispatch = useDispatch();

  const shopOrder = data.shopOrders;
  const shopId = shopOrder?.shop?._id || shopOrder?.shop;
  const currentStatus = shopOrder?.status;
  const actions = NEXT_ACTIONS[currentStatus] || [];

  const handleUpdateStatus = async (status) => {
    setUpdating(true);
    try {
      const result = await api.post(`/api/order/update-status/${data._id}/${shopId}`, {
        status,
      });
      dispatch(updateOrderStatus({ orderId: data._id, shopId, status }));
      setAvailableBoys(result.data?.availableBoys || []);
      toast.success(result.data?.message || `Order marked ${status}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update order status"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {data.user?.fullName || "Customer"}
            </h3>
            {data.orderNumber && (
              <span className="text-xs font-bold text-slate-400">#{data.orderNumber}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{data.user?.email}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
            <IoCallSharp className="text-[#FF4D2D]" />
            <span>{data.user?.mobile}</span>
          </p>
        </div>

        <div className="text-right space-y-1">
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-orange-50 text-[#FF4D2D]">
            {currentStatus}
          </span>
          <p className="text-xs text-slate-500">
            {data.paymentMethod === "online"
              ? data.paymentStatus === "paid" || data.payment
                ? "Paid Online"
                : "Payment Pending"
              : "Cash on Delivery"}
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-600 bg-[#F8F9FB] p-3 rounded-xl">
        <span className="font-semibold text-slate-800">Deliver to: </span>
        {data.deliveryAddress?.text}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {shopOrder?.shopOrderItems?.map((item, idx) => (
          <div
            key={item._id || idx}
            className="shrink-0 w-36 border border-slate-200/70 rounded-xl p-2 bg-white"
          >
            <img
              src={resolveImageUrl(item.item?.image || item.image)}
              alt={item.name}
              className="w-full h-20 object-cover rounded-lg"
            />
            <p className="text-xs font-bold text-slate-900 mt-1.5 truncate">{item.name}</p>
            <p className="text-[11px] text-slate-500">
              {item.quantity} × ₹{item.price}
            </p>
          </div>
        ))}
      </div>

      {currentStatus === "out of delivery" && (
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/80 text-xs text-slate-800">
          {shopOrder?.assignedDeliveryBoy ? (
            <p className="font-semibold">
              Assigned Partner: {shopOrder.assignedDeliveryBoy.fullName} (
              {shopOrder.assignedDeliveryBoy.mobile})
            </p>
          ) : availableBoys.length > 0 ? (
            <div>
              <p className="font-semibold mb-1">Broadcasted to nearby partners:</p>
              {availableBoys.map((b) => (
                <div key={b.id} className="text-slate-700">
                  {b.fullName} — {b.mobile}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 font-medium">
              Waiting for an online delivery partner to accept...
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="text-sm font-extrabold text-slate-900 tabular-nums">
          Subtotal: ₹{shopOrder?.subtotal}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((act) => (
            <button
              key={act.status}
              type="button"
              disabled={updating}
              onClick={() => handleUpdateStatus(act.status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60 ${act.style}`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OwnerOrderCard;
