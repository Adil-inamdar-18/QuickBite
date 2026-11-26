import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileInvoice, FaMapMarkerAlt, FaStar, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ready: "bg-purple-50 text-purple-700 border-purple-200",
  "out of delivery": "bg-orange-50 text-[#FF4D2D] border-orange-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function UserOrderCard({ data, myReviewsMap = {}, onRated, onCancelled }) {
  const navigate = useNavigate();
  const [selectedRatings, setSelectedRatings] = useState({});
  const [comments, setComments] = useState({});
  const [invoiceData, setInvoiceData] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRatingSubmit = async (itemId, stars) => {
    try {
      const comment = comments[itemId] || "";
      await api.post("/api/item/rating", { itemId, rating: stars, comment });
      setSelectedRatings((prev) => ({ ...prev, [itemId]: stars }));
      toast.success("Thanks for rating!");
      onRated?.(itemId, stars);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to submit rating"));
    }
  };

  const handleCancelOrder = async (shopOrderId) => {
    const reason = window.prompt("Reason for cancellation (optional):", "Changed my mind");
    if (reason === null) return;
    setCancelling(true);
    try {
      const res = await api.post(`/api/order/cancel/${data._id}/${shopOrderId}`, { reason });
      toast.success("Order cancelled");
      onCancelled?.(res.data.order);
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot cancel this order"));
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenInvoice = async () => {
    try {
      const res = await api.get(`/api/order/invoice/${data._id}`);
      setInvoiceData(res.data.invoice);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to load invoice"));
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="font-bold text-slate-900">
              Order #{data.orderNumber || data._id.slice(-6).toUpperCase()}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(data.createdAt)}</p>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
              {data.paymentMethod === "cod"
                ? "Cash on Delivery"
                : data.paymentStatus === "paid" || data.payment
                  ? "Paid Online"
                  : data.paymentStatus === "refunded"
                    ? "Refunded"
                    : "Payment Pending"}
            </span>
          </div>
        </div>

        {data.shopOrders?.map((shopOrder) => {
          const canCancel = ["pending", "confirmed"].includes(shopOrder.status);
          const badgeClass = STATUS_STYLE[shopOrder.status] || "bg-slate-100 text-slate-700";

          return (
            <div
              key={shopOrder._id}
              className="border border-slate-100 rounded-xl p-4 bg-[#F8F9FB] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{shopOrder.shop?.name || "Restaurant"}</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${badgeClass}`}>
                  {shopOrder.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shopOrder.shopOrderItems.map((entry, idx) => {
                  const itemId = entry.item?._id || entry.item;
                  const alreadyRated = myReviewsMap[itemId] || selectedRatings[itemId];

                  return (
                    <div
                      key={entry._id || idx}
                      className="flex flex-col justify-between gap-2 bg-white border border-slate-200/70 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(entry.item?.image || entry.image)}
                          alt={entry.name}
                          className="w-14 h-14 object-cover rounded-lg border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{entry.name}</p>
                          <p className="text-xs text-slate-500">
                            Qty: {entry.quantity} × ₹{entry.price}
                          </p>
                        </div>
                      </div>

                      {shopOrder.status === "delivered" && itemId && (
                        <div className="pt-2 border-t border-slate-100">
                          {alreadyRated ? (
                            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <FaStar className="text-amber-400" />
                              Rated {alreadyRated}/5
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Short review (optional)"
                                value={comments[itemId] || ""}
                                onChange={(e) =>
                                  setComments((prev) => ({ ...prev, [itemId]: e.target.value }))
                                }
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#FF4D2D]"
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-500 mr-1">Rate:</span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleRatingSubmit(itemId, star)}
                                    className="text-amber-400 hover:scale-110 transition cursor-pointer"
                                    title={`Rate ${star} stars`}
                                  >
                                    <FaStar size={14} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                <p className="text-xs text-slate-500">
                  Items Subtotal: <span className="font-bold text-slate-900">₹{shopOrder.subtotal}</span>
                </p>
                {canCancel && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => handleCancelOrder(shopOrder._id)}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">
              ₹{data.totalAmount}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              <FaFileInvoice />
              <span>Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/track-order/${data._id}`)}
              className="inline-flex items-center gap-1.5 bg-[#FF4D2D] hover:bg-[#E63E20] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <FaMapMarkerAlt />
              <span>Track Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">QuickBite Receipt</h3>
                <p className="text-xs text-slate-500">{invoiceData.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setInvoiceData(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer no-print"
              >
                <FaTimes />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold">Customer:</span> {invoiceData.customer?.fullName}</p>
              <p><span className="font-semibold">Address:</span> {invoiceData.deliveryAddress?.text}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(invoiceData.date)}</p>
              <p><span className="font-semibold">Payment:</span> {invoiceData.paymentMethod?.toUpperCase()} ({invoiceData.paymentStatus})</p>
            </div>

            <div className="border-t border-b border-slate-100 py-3 space-y-2 text-sm">
              {invoiceData.shopOrders?.flatMap((so) => so.items).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-semibold">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{invoiceData.itemsSubtotal}</span>
              </div>
              {invoiceData.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({invoiceData.couponCode})</span>
                  <span>-₹{invoiceData.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{invoiceData.deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes (GST)</span>
                <span>₹{invoiceData.taxAmount}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span>₹{invoiceData.totalAmount}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#FF4D2D] text-white text-xs font-bold cursor-pointer"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserOrderCard;
