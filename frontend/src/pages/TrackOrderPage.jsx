import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaCheckCircle, FaPhoneAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import Nav from "../component/Nav";
import Footer from "../component/Footer";
import DeliveryBoyTracking from "../component/DeliveryBoyTracking";
import { PageLoader } from "../component/Skeletons";
import { api, getErrorMessage } from "../api/client";

const ORDER_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out of delivery",
  "delivered",
];

function TrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSelector((state) => state.user);

  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState({});

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/order/get-order-by-id/${orderId}`);
      setCurrentOrder(res.data.order);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to load order details"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit("joinOrderRoom", { orderId });

    const handleLocation = ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocation((prev) => ({
        ...prev,
        [deliveryBoyId]: { lat: latitude, lon: longitude },
      }));
    };

    const handleStatus = ({ orderId: updatedId }) => {
      if (String(updatedId) === String(orderId)) {
        fetchOrder();
      }
    };

    const handleAssigned = ({ orderId: updatedId }) => {
      if (String(updatedId) === String(orderId)) {
        fetchOrder();
      }
    };

    socket.on("updateDeliveryLocation", handleLocation);
    socket.on("update-status", handleStatus);
    socket.on("delivery-assigned", handleAssigned);

    return () => {
      socket.off("updateDeliveryLocation", handleLocation);
      socket.off("update-status", handleStatus);
      socket.off("delivery-assigned", handleAssigned);
    };
  }, [socket, orderId]);

  if (loading) return <PageLoader label="Loading live tracking..." />;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/my-orders")}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#FF4D2D] cursor-pointer"
          >
            <IoIosArrowRoundBack size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Track Order {currentOrder?.orderNumber ? `#${currentOrder.orderNumber}` : ""}
            </h1>
            <p className="text-xs text-slate-500">
              Live restaurant & delivery status updates
            </p>
          </div>
        </div>

        {currentOrder?.shopOrders?.map((shopOrder) => {
          const liveBoy = liveLocation[shopOrder.assignedDeliveryBoy?._id];
          const deliveryBoyLocation = {
            lat: liveBoy?.lat ?? shopOrder.assignedDeliveryBoy?.location?.coordinates?.[1],
            lon: liveBoy?.lon ?? shopOrder.assignedDeliveryBoy?.location?.coordinates?.[0],
          };
          const shopCoords = shopOrder.shop?.location?.coordinates;
          const shopLocation =
            shopCoords && (shopCoords[0] !== 0 || shopCoords[1] !== 0)
              ? { lat: shopCoords[1], lon: shopCoords[0] }
              : null;

          const currentStepIndex = ORDER_STEPS.indexOf(shopOrder.status);
          const isCancelled = ["cancelled", "rejected"].includes(shopOrder.status);

          return (
            <div
              key={shopOrder._id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5"
            >
              <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{shopOrder.shop?.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {shopOrder.shopOrderItems.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                  </p>
                </div>
                <span className="text-base font-extrabold text-[#FF4D2D] tabular-nums">
                  ₹{currentOrder.totalAmount}
                </span>
              </div>

              {/* Status Timeline */}
              {isCancelled ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-700 capitalize">
                  Order {shopOrder.status}: {shopOrder.cancellationReason || "Cancelled"}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ORDER_STEPS.map((step, idx) => {
                    const completed = idx <= currentStepIndex;
                    return (
                      <div key={step} className="flex flex-col items-center text-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            completed
                              ? "bg-[#FF4D2D] text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {completed ? <FaCheckCircle size={13} /> : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] font-semibold capitalize ${
                            completed ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {step === "out of delivery" ? "On the way" : step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delivery Address */}
              <div className="bg-[#F8F9FB] rounded-xl p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Delivery Address</p>
                <p>{currentOrder.deliveryAddress?.text}</p>
              </div>

              {/* Delivery Partner Card */}
              {shopOrder.status !== "delivered" && !isCancelled && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80">
                  {shopOrder.assignedDeliveryBoy ? (
                    <>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase">
                          Delivery Partner
                        </p>
                        <p className="font-bold text-slate-900">
                          {shopOrder.assignedDeliveryBoy.fullName}
                        </p>
                        {shopOrder.assignedDeliveryBoy.vehicleInfo?.number && (
                          <p className="text-xs text-slate-500">
                            {shopOrder.assignedDeliveryBoy.vehicleInfo.type} •{" "}
                            {shopOrder.assignedDeliveryBoy.vehicleInfo.number}
                          </p>
                        )}
                      </div>
                      <a
                        href={`tel:${shopOrder.assignedDeliveryBoy.mobile}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        <FaPhoneAlt size={12} />
                        <span>{shopOrder.assignedDeliveryBoy.mobile}</span>
                      </a>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-slate-500">
                      Assigning a nearby delivery partner...
                    </p>
                  )}
                </div>
              )}

              {/* Live Map */}
              {shopOrder.assignedDeliveryBoy &&
                shopOrder.status !== "delivered" &&
                !isCancelled &&
                deliveryBoyLocation.lat &&
                deliveryBoyLocation.lon && (
                  <DeliveryBoyTracking
                    data={{
                      deliveryBoyLocation,
                      shopLocation,
                      customerLocation: {
                        lat: currentOrder.deliveryAddress.latitude,
                        lon: currentOrder.deliveryAddress.longitude,
                      },
                    }}
                  />
                )}
            </div>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}

export default TrackOrderPage;
