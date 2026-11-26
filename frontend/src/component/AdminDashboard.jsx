import React, { useEffect, useState } from "react";
import {
  FaCheck,
  FaCog,
  FaCrown,
  FaMotorcycle,
  FaPlus,
  FaShieldAlt,
  FaStore,
  FaTag,
  FaTimes,
  FaUser,
  FaUsers,
  FaUtensils,
} from "react-icons/fa";
import { TbReceiptRupeeFilled } from "react-icons/tb";
import { MdSupportAgent } from "react-icons/md";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";

import Nav from "./Nav";
import Footer from "./Footer";
import EmptyState from "./EmptyState";
import { api, getErrorMessage } from "../api/client";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [tickets, setTickets] = useState([]);

  // New Category Form
  const [newCatName, setNewCatName] = useState("");
  // New Coupon Form
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "299",
    maxDiscount: "100",
    expiresAt: "",
  });

  const loadOverview = async () => {
    try {
      const res = await api.get("/api/admin/overview");
      setOverview(res.data.overview);
    } catch {
      // ignore
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/api/admin/users");
      setUsers(res.data.users);
    } catch {
      // ignore
    }
  };

  const loadShops = async () => {
    try {
      const res = await api.get("/api/admin/shops");
      setShops(res.data.shops);
    } catch {
      // ignore
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get("/api/admin/orders");
      setOrders(res.data.orders);
    } catch {
      // ignore
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/admin/categories");
      setCategories(res.data.categories);
    } catch {
      // ignore
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await api.get("/api/admin/coupons");
      setCoupons(res.data.coupons);
    } catch {
      // ignore
    }
  };

  const loadTickets = async () => {
    try {
      const res = await api.get("/api/admin/support");
      setTickets(res.data.tickets);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "shops") loadShops();
    if (activeTab === "orders") loadOrders();
    if (activeTab === "categories") loadCategories();
    if (activeTab === "coupons") loadCoupons();
    if (activeTab === "support") loadTickets();
  }, [activeTab]);

  const handleToggleBlock = async (userId) => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/toggle-block`);
      toast.success(res.data.message);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateShop = async (shopId, approvalStatus, isSuspended) => {
    try {
      const res = await api.patch(`/api/admin/shops/${shopId}/status`, {
        approvalStatus,
        isSuspended,
      });
      toast.success(res.data.message);
      loadShops();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post("/api/admin/categories", { name: newCatName.trim() });
      setNewCatName("");
      toast.success("Category created");
      loadCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await api.delete(`/api/admin/categories/${categoryId}`);
      toast.success("Category deleted");
      loadCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/coupons", newCoupon);
      toast.success("Coupon created");
      setNewCoupon({
        code: "",
        discountType: "percentage",
        discountValue: "",
        minOrderAmount: "299",
        maxDiscount: "100",
        expiresAt: "",
      });
      loadCoupons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    try {
      await api.delete(`/api/admin/coupons/${couponId}`);
      toast.success("Coupon deleted");
      loadCoupons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReplyTicket = async (ticketId) => {
    const reply = window.prompt("Enter admin reply to customer:");
    if (!reply) return;
    try {
      await api.patch(`/api/admin/support/${ticketId}`, {
        adminReply: reply,
        status: "resolved",
      });
      toast.success("Ticket resolved & replied");
      loadTickets();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <FaCrown /> },
    { id: "users", label: "Users", icon: <FaUsers /> },
    { id: "shops", label: "Restaurants", icon: <FaStore /> },
    { id: "orders", label: "Orders", icon: <TbReceiptRupeeFilled /> },
    { id: "categories", label: "Categories", icon: <FaUtensils /> },
    { id: "coupons", label: "Coupons", icon: <FaTag /> },
    { id: "support", label: "Support Tickets", icon: <MdSupportAgent /> },
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF4D2D] flex items-center justify-center font-bold">
              <FaShieldAlt size={18} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Admin Control Center</h1>
              <p className="text-xs text-slate-500">Platform-wide management & security controls</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  activeTab === t.id
                    ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Customers", val: overview?.totalCustomers || 0 },
                { label: "Restaurants", val: overview?.totalRestaurants || 0 },
                { label: "Delivery Partners", val: overview?.totalDeliveryBoys || 0 },
                { label: "Total Orders", val: overview?.totalOrders || 0 },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-500">{c.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{c.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">7-Day Platform Revenue</h3>
                <span className="text-sm font-extrabold text-[#FF4D2D]">
                  Total: ₹{overview?.totalRevenue || 0}
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.dailyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`₹${v}`, "Gross Sales"]} />
                    <Bar dataKey="revenue" fill="#FF4D2D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs overflow-x-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4">All Registered Users ({users.length})</h2>
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5">Mobile</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-3 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3 capitalize">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">{u.role}</span>
                    </td>
                    <td className="py-3">{u.mobile}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${u.isBlocked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(u._id)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                            u.isBlocked ? "bg-emerald-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === "shops" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs overflow-x-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4">Restaurants ({shops.length})</h2>
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Restaurant</th>
                  <th className="py-2.5">Owner</th>
                  <th className="py-2.5">City</th>
                  <th className="py-2.5">Approval</th>
                  <th className="py-2.5">Suspension</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shops.map((s) => (
                  <tr key={s._id}>
                    <td className="py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3">{s.owner?.fullName}</td>
                    <td className="py-3">{s.city}</td>
                    <td className="py-3 capitalize">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${s.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {s.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${s.isSuspended ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {s.isSuspended ? "Suspended" : "Good Standing"}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateShop(s._id, s.approvalStatus === "approved" ? "pending" : "approved", s.isSuspended)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold cursor-pointer"
                      >
                        {s.approvalStatus === "approved" ? "Unapprove" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateShop(s._id, s.approvalStatus, !s.isSuspended)}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${s.isSuspended ? "bg-emerald-600 text-white" : "bg-red-50 text-red-600"}`}
                      >
                        {s.isSuspended ? "Lift Suspension" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs overflow-x-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4">Platform Orders ({orders.length})</h2>
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Order #</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Payment</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td className="py-3 font-bold text-slate-900">#{o.orderNumber || o._id.slice(-6)}</td>
                    <td className="py-3">{o.user?.fullName}</td>
                    <td className="py-3 font-semibold text-slate-900">₹{o.totalAmount}</td>
                    <td className="py-3 uppercase">{o.paymentMethod} ({o.paymentStatus})</td>
                    <td className="py-3 capitalize">{o.shopOrders?.[0]?.status || "pending"}</td>
                    <td className="py-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <form onSubmit={handleCreateCategory} className="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 h-fit">
              <h3 className="font-bold text-sm text-slate-900">Add New Category</h3>
              <input
                type="text"
                placeholder="Category Name (e.g. Sushi)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-xs font-bold cursor-pointer"
              >
                Create Category
              </button>
            </form>

            <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5">
              <h3 className="font-bold text-sm text-slate-900 mb-3">Categories ({categories.length})</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c._id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-[#F8F9FB]"
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c._id)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <FaTimes size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <form onSubmit={handleCreateCoupon} className="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 h-fit text-xs">
              <h3 className="font-bold text-sm text-slate-900">Create Promo Coupon</h3>
              <input
                type="text"
                placeholder="CODE (e.g. WELCOME50)"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 uppercase outline-none focus:border-[#FF4D2D]"
                required
              />
              <select
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
              <input
                type="number"
                placeholder="Discount Value (e.g. 20)"
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
                required
              />
              <input
                type="number"
                placeholder="Min Order Amount (₹)"
                value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
              />
              <input
                type="date"
                value={newCoupon.expiresAt}
                onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white font-bold cursor-pointer"
              >
                Save Coupon
              </button>
            </form>

            <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Active Coupons ({coupons.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coupons.map((cp) => (
                  <div key={cp._id} className="p-4 rounded-xl border border-slate-200 bg-[#F8F9FB] flex justify-between items-start text-xs">
                    <div>
                      <span className="font-extrabold text-sm text-[#FF4D2D]">{cp.code}</span>
                      <p className="text-slate-600 mt-1">
                        {cp.discountType === "percentage" ? `${cp.discountValue}% OFF` : `₹${cp.discountValue} OFF`} (Min order ₹{cp.minOrderAmount})
                      </p>
                      <p className="text-slate-400 mt-0.5">Used: {cp.usedCount} times</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(cp._id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                    >
                      <FaTimes size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === "support" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Customer Support Queue ({tickets.length})</h2>
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No open tickets at the moment.</p>
            ) : (
              tickets.map((t) => (
                <div key={t._id} className="p-4 rounded-xl border border-slate-200 bg-[#F8F9FB] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">{t.subject} ({t.user?.fullName} • {t.user?.email})</p>
                    <span className="px-2 py-0.5 rounded-full font-bold uppercase bg-orange-50 text-[#FF4D2D]">{t.status}</span>
                  </div>
                  <p className="text-slate-600">{t.message}</p>
                  {t.adminReply ? (
                    <p className="text-emerald-700 font-semibold">Reply: {t.adminReply}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReplyTicket(t._id)}
                      className="px-3 py-1.5 rounded-lg bg-[#FF4D2D] text-white font-bold cursor-pointer"
                    >
                      Reply & Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
