import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaClock,
  FaPen,
  FaPlus,
  FaStore,
  FaUtensils,
} from "react-icons/fa";
import { TbReceiptRupeeFilled } from "react-icons/tb";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";

import Nav from "./Nav";
import Footer from "./Footer";
import OwnerItemCard from "./OwnerItemCard";
import OwnerOrderCard from "./OwnerOrderCard";
import EmptyState from "./EmptyState";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setMyShopData } from "../redux/ownerSlice";
import { addMyOrder } from "../redux/userslice";

function OwnerDashboard() {
  const { myShopData } = useSelector((state) => state.owner);
  const { myOrders, socket, userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const loadAnalytics = async () => {
    try {
      const res = await api.get("/api/shop/analytics");
      setAnalytics(res.data.analytics);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (myShopData) {
      loadAnalytics();
    }
  }, [myShopData?._id, myOrders.length]);

  useEffect(() => {
    if (!socket || !userData?._id) return;
    const handleNewOrder = (data) => {
      const ownerId = data.shopOrders?.owner?._id || data.shopOrders?.owner;
      if (String(ownerId) === String(userData._id)) {
        dispatch(addMyOrder(data));
        toast.success(`New order #${data.orderNumber || ""} received!`);
      }
    };
    socket.on("newOrder", handleNewOrder);
    return () => socket.off("newOrder", handleNewOrder);
  }, [socket, userData?._id, dispatch]);

  const handleToggleShopOpen = async () => {
    setTogglingStatus(true);
    try {
      const res = await api.post("/api/shop/toggle-status");
      dispatch(setMyShopData(res.data.shop));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  };

  const activeOrders = myOrders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready", "out of delivery"].includes(
      o.shopOrders?.status,
    ),
  );

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {!myShopData ? (
          <div className="max-w-lg mx-auto py-12">
            <EmptyState
              icon={<FaUtensils />}
              title="Register Your Restaurant"
              subtitle="Set up your restaurant profile, upload photos, and start receiving online food orders on QuickBite."
              actionLabel="Set Up Restaurant"
              onAction={() => navigate("/create-edit-shop")}
            />
          </div>
        ) : (
          <>
            {/* Restaurant Top Header */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={resolveImageUrl(myShopData.image)}
                  alt={myShopData.name}
                  className="w-18 h-18 rounded-2xl object-cover border border-slate-100 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {myShopData.name}
                    </h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        myShopData.isOpen
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {myShopData.isOpen ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {myShopData.address}, {myShopData.city}, {myShopData.state}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <FaClock className="text-[#FF4D2D]" />
                    <span>
                      Hours: {myShopData.openingTime || "09:00"} – {myShopData.closingTime || "23:00"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleToggleShopOpen}
                  disabled={togglingStatus}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    myShopData.isOpen
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {myShopData.isOpen ? "Accepting Orders (Go Offline)" : "Closed (Go Online)"}
                </button>
                <button
                  onClick={() => navigate("/create-edit-shop")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <FaPen size={11} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => navigate("/add-item")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-xs font-bold cursor-pointer"
                >
                  <FaPlus size={11} />
                  <span>Add Dish</span>
                </button>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "overview", label: "Overview & Analytics", icon: <FaChartLine /> },
                { id: "orders", label: `Orders (${activeOrders.length} active)`, icon: <TbReceiptRupeeFilled /> },
                { id: "menu", label: `Menu (${myShopData.items?.length || 0})`, icon: <FaStore /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview & Analytics */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Today's Revenue", value: `₹${analytics?.todayRevenue || 0}` },
                    { label: "Weekly Revenue", value: `₹${analytics?.weeklyRevenue || 0}` },
                    { label: "Monthly Revenue", value: `₹${analytics?.monthlyRevenue || 0}` },
                    { label: "Total Revenue", value: `₹${analytics?.totalRevenue || 0}` },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs"
                    >
                      <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                    <h3 className="text-base font-bold text-slate-900 mb-4">
                      Last 7 Days Sales
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.dailySales || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(val) => [`₹${val}`, "Revenue"]} />
                          <Bar dataKey="revenue" fill="#FF4D2D" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                    <h3 className="text-base font-bold text-slate-900 mb-4">
                      Best-Selling Dishes
                    </h3>
                    {!analytics?.bestSellingItems?.length ? (
                      <p className="text-sm text-slate-400 py-12 text-center">
                        Sales insights will appear once orders are completed.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.bestSellingItems.map((item, idx) => (
                          <div
                            key={item.itemId}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FB] border border-slate-100"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF4D2D] text-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-semibold text-slate-800 truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-slate-900">{item.quantitySold} sold</p>
                              <p className="text-[11px] text-slate-500">₹{item.revenue}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {myOrders.length === 0 ? (
                  <EmptyState
                    icon={<TbReceiptRupeeFilled />}
                    title="No orders yet"
                    subtitle="Incoming customer orders will show up here for you to confirm and prepare."
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {myOrders.map((order) => (
                      <OwnerOrderCard key={order._id} data={order} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Menu Tab */}
            {activeTab === "menu" && (
              <div className="space-y-4">
                {myShopData.items?.length === 0 ? (
                  <EmptyState
                    icon={<FaUtensils />}
                    title="Your menu is empty"
                    subtitle="Add your signature dishes with pricing, category, and mouth-watering photos."
                    actionLabel="Add First Dish"
                    onAction={() => navigate("/add-item")}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myShopData.items.map((item) => (
                      <OwnerItemCard data={item} key={item._id} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default OwnerDashboard;
