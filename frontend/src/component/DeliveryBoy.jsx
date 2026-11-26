import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaBoxOpen, FaCheck, FaMotorcycle, FaPhoneAlt, FaPowerOff, FaRoute } from "react-icons/fa";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";

import Nav from "./Nav";
import Footer from "./Footer";
import DeliveryBoyTracking from "./DeliveryBoyTracking";
import EmptyState from "./EmptyState";
import { api, getErrorMessage } from "../api/client";
import { setUserData } from "../redux/userslice";

function DeliveryBoy() {
  const { userData, socket } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const [currentOrder, setCurrentOrder] = useState(null);
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otp, setOtp] = useState("");
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);
  const [todayStats, setTodayStats] = useState({ hourlyStats: [], summary: {}, history: [] });
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/api/order/get-assignments");
      setAvailableAssignments(res.data.assignments || []);
    } catch {
      // ignore
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const res = await api.get("/api/order/get-current-order");
      setCurrentOrder(res.data.currentOrder || null);
    } catch {
      // ignore
    }
  };

  const fetchTodayDelivery = async () => {
    try {
      const res = await api.get("/api/order/get-today-delivery");
      setTodayStats(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchCurrentOrder();
    fetchTodayDelivery();
  }, [userData?._id]);

  // Live GPS tracking watcher
  useEffect(() => {
    if (!socket || !userData?._id || !navigator.geolocation || !userData.isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDeliveryBoyLocation({ lat: latitude, lon: longitude });
        socket.emit("updateLocation", { latitude, longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket, userData?._id, userData?.isOnline]);

  // Socket listener for new incoming assignments
  useEffect(() => {
    if (!socket || !userData?._id) return;

    const handleNewAssignment = (data) => {
      if (data.sentTo === String(userData._id)) {
        setAvailableAssignments((prev) => {
          if (prev.some((a) => a.assignmentId === data.assignmentId)) return prev;
          toast("New delivery request nearby!", { icon: "🛵" });
          return [data, ...prev];
        });
      }
    };

    socket.on("new-assignment", handleNewAssignment);
    return () => socket.off("new-assignment", handleNewAssignment);
  }, [socket, userData?._id]);

  const handleToggleOnline = async () => {
    try {
      const res = await api.post("/api/user/toggle-online", { isOnline: !userData.isOnline });
      dispatch(setUserData({ ...userData, isOnline: res.data.isOnline }));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAcceptAssignment = async (assignmentId) => {
    try {
      await api.get(`/api/order/accept-order/${assignmentId}`);
      toast.success("Order accepted!");
      fetchCurrentOrder();
      fetchAssignments();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept order"));
    }
  };

  const handleRejectAssignment = async (assignmentId) => {
    try {
      await api.post(`/api/order/reject-order/${assignmentId}`);
      setAvailableAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
      toast.success("Declined");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleMarkPickedUp = async () => {
    if (!currentOrder?.assignmentId) return;
    try {
      await api.post(`/api/order/pickup/${currentOrder.assignmentId}`);
      toast.success("Marked as picked up from restaurant");
      fetchCurrentOrder();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSendOtp = async () => {
    if (!currentOrder) return;
    setLoadingOtp(true);
    try {
      const res = await api.post("/api/order/send-delivery-otp", {
        orderId: currentOrder.id,
        shopOrderId: currentOrder.shopOrder?._id,
      });
      setShowOtpBox(true);
      toast.success(res.data.message || "OTP generated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to generate OTP"));
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return toast.error("Enter OTP");
    setVerifyingOtp(true);
    try {
      const res = await api.post("/api/order/verify-delivery-otp", {
        orderId: currentOrder.id,
        shopOrderId: currentOrder.shopOrder?._id,
        otp: otp.trim(),
      });
      toast.success(res.data.message || "Order delivered!");
      setCurrentOrder(null);
      setShowOtpBox(false);
      setOtp("");
      fetchTodayDelivery();
      fetchAssignments();
    } catch (err) {
      toast.error(getErrorMessage(err, "Invalid or expired OTP"));
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-5xl w-full mx-auto px-4 sm:px-6 space-y-6">
        {/* Partner Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF4D2D] flex items-center justify-center text-2xl font-bold">
              <FaMotorcycle />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{userData?.fullName}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    userData?.isOnline
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {userData?.isOnline ? "Online (Receiving)" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {userData?.vehicleInfo?.type || "Bike"} • {userData?.vehicleInfo?.number || "No Vehicle Plate Set"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleOnline}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              userData?.isOnline
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <FaPowerOff />
            <span>{userData?.isOnline ? "Go Offline" : "Go Online"}</span>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "active", label: `Active Delivery ${currentOrder ? "(1)" : ""}` },
            { id: "requests", label: `Available Requests (${availableAssignments.length})` },
            { id: "earnings", label: "Earnings & History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Delivery Tab */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {!currentOrder ? (
              <EmptyState
                icon={<FaBoxOpen />}
                title="No active delivery assigned"
                subtitle={
                  userData?.isOnline
                    ? "Stay tuned! Nearby delivery requests will show in the 'Available Requests' tab."
                    : "You are currently offline. Turn your status Online to receive delivery orders."
                }
                actionLabel={!userData?.isOnline ? "Go Online" : "View Requests"}
                onAction={!userData?.isOnline ? handleToggleOnline : () => setActiveTab("requests")}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FF4D2D]">
                      Active Order #{currentOrder.orderNumber}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                      {currentOrder.shopOrder?.shop?.name || "Restaurant"}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-orange-50 text-[#FF4D2D]">
                    {currentOrder.assignmentStatus === "picked_up" ? "Out for Delivery" : "Assigned (Pickup Pending)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="p-4 rounded-xl bg-[#F8F9FB] space-y-1">
                    <p className="font-bold text-slate-800 text-sm">Restaurant Pickup</p>
                    <p>{currentOrder.shopOrder?.shop?.address}</p>
                    {currentOrder.shopOrder?.shop?.phone && (
                      <p className="text-slate-500">Contact: {currentOrder.shopOrder.shop.phone}</p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F9FB] space-y-1">
                    <p className="font-bold text-slate-800 text-sm">Customer Dropoff</p>
                    <p>{currentOrder.deliveryAddress?.text}</p>
                    <p className="font-semibold text-slate-700">
                      Customer: {currentOrder.user?.fullName} ({currentOrder.user?.mobile})
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="border border-slate-100 rounded-xl p-3 bg-white">
                  <p className="text-xs font-bold text-slate-700 mb-2">Order Items:</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    {currentOrder.shopOrder?.shopOrderItems?.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.name} × {it.quantity}</span>
                        <span className="font-semibold">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Navigation Map */}
                <DeliveryBoyTracking
                  data={{
                    deliveryBoyLocation: deliveryBoyLocation || {
                      lat: userData?.location?.coordinates?.[1] || 18.5204,
                      lon: userData?.location?.coordinates?.[0] || 73.8567,
                    },
                    shopLocation: currentOrder.shopOrder?.shop?.location?.coordinates
                      ? {
                          lat: currentOrder.shopOrder.shop.location.coordinates[1],
                          lon: currentOrder.shopOrder.shop.location.coordinates[0],
                        }
                      : null,
                    customerLocation: {
                      lat: currentOrder.deliveryAddress?.latitude,
                      lon: currentOrder.deliveryAddress?.longitude,
                    },
                  }}
                />

                {/* Workflow Actions */}
                {currentOrder.assignmentStatus === "assigned" && (
                  <button
                    type="button"
                    onClick={handleMarkPickedUp}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
                  >
                    Confirm Order Picked Up From Restaurant
                  </button>
                )}

                {currentOrder.assignmentStatus === "picked_up" && (
                  <div className="space-y-3">
                    {!showOtpBox ? (
                      <button
                        type="button"
                        disabled={loadingOtp}
                        onClick={handleSendOtp}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer flex justify-center disabled:opacity-60"
                      >
                        {loadingOtp ? <ClipLoader size={18} color="white" /> : "Arrived at Customer Doorstep (Send Delivery OTP)"}
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl border border-slate-200 bg-[#F8F9FB] space-y-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Ask customer <span className="text-[#FF4D2D]">{currentOrder.user?.fullName}</span> for the 6-digit confirmation OTP sent to their email / in-app alert:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold tracking-widest outline-none focus:border-[#FF4D2D]"
                          />
                          <button
                            type="button"
                            disabled={verifyingOtp}
                            onClick={handleVerifyOtp}
                            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                          >
                            {verifyingOtp ? <ClipLoader size={15} color="white" /> : "Verify & Complete"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Available Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {availableAssignments.length === 0 ? (
              <EmptyState
                icon={<FaRoute />}
                title="No delivery requests right now"
                subtitle="When restaurant orders are dispatched near you, they will appear here in real time."
              />
            ) : (
              availableAssignments.map((a) => (
                <div
                  key={a.assignmentId}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-md">
                    <p className="font-bold text-slate-900 text-base">{a.shopName}</p>
                    <p className="text-xs text-slate-500">Pickup: {a.shopAddress}</p>
                    <p className="text-xs text-slate-500">Drop: {a.deliveryAddress?.text}</p>
                    <p className="text-xs font-semibold text-emerald-600 pt-1">
                      Earning: ₹{a.deliveryEarning || 50} • {a.items?.length || 0} items
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRejectAssignment(a.assignmentId)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptAssignment(a.assignmentId)}
                      className="px-5 py-2 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-xs font-bold cursor-pointer"
                    >
                      Accept Delivery
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Earnings & History Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Today's Deliveries", val: todayStats.summary?.todayCount || 0 },
                { label: "Today's Earnings", val: `₹${todayStats.summary?.todayEarnings || 0}` },
                { label: "Month's Earnings", val: `₹${todayStats.summary?.monthEarnings || 0}` },
                { label: "Total Lifetime", val: `₹${todayStats.summary?.totalEarnings || 0}` },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{card.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Today's Hourly Deliveries</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={todayStats.hourlyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v} deliveries`, "Completed"]} labelFormatter={(l) => `${l}:00`} />
                    <Bar dataKey="count" fill="#FF4D2D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
              <h3 className="text-base font-bold text-slate-900">Recent Completed Deliveries</h3>
              {!todayStats.history?.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">No completed deliveries yet today.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todayStats.history.map((h, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{h.shopName}</p>
                        <p className="text-slate-500 truncate max-w-sm">{h.deliveryAddress}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 text-sm">+₹{h.earning}</span>
                        <p className="text-slate-400">{new Date(h.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default DeliveryBoy;
