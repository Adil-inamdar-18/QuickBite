import React, { useEffect, useRef, useState } from "react";
import { FaLocationDot, FaPlus } from "react-icons/fa6";
import {
  FaBell,
  FaHeart,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaUserCircle,
  FaUtensils,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { TbReceiptRupeeFilled } from "react-icons/tb";
import { MdSupportAgent } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client";
import {
  markAllNotificationsReadState,
  markNotificationReadState,
  setCurrentCity,
  setSearchItems,
  setSearchShops,
  setUserData,
} from "../redux/userslice";
import { setMyShopData } from "../redux/ownerSlice";

function Nav() {
  const {
    userData,
    currentCity,
    cartItems,
    myOrders,
    notifications,
    unreadCount,
  } = useSelector((state) => state.user);
  const { myShopData } = useSelector((state) => state.owner);

  const [showInfo, setShowInfo] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(currentCity || "Pune");
  const [query, setQuery] = useState("");

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const totalCartCount = cartItems.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
  const activeOwnerOrdersCount =
    userData?.role === "owner"
      ? myOrders.filter((o) =>
          ["pending", "confirmed", "preparing", "ready"].includes(o.shopOrders?.status),
        ).length
      : 0;

  useEffect(() => {
    setCityInput(currentCity || "Pune");
  }, [currentCity]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowInfo(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (userData && userData.role !== "user") return;
    const timer = setTimeout(async () => {
      if (query.trim()) {
        try {
          const res = await api.get(
            `/api/item/search-items?query=${encodeURIComponent(query.trim())}&city=${encodeURIComponent(currentCity || "all")}`,
          );
          dispatch(setSearchItems(res.data?.items || []));
          dispatch(setSearchShops(res.data?.shops || []));
        } catch {
          // ignore transient search errors
        }
      } else {
        dispatch(setSearchItems(null));
        dispatch(setSearchShops([]));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, currentCity, userData?.role, dispatch]);

  const handleLogout = async () => {
    try {
      await api.get("/api/auth/signout");
    } catch {
      // clear local state regardless
    }
    dispatch(setUserData(null));
    dispatch(setMyShopData(null));
    toast.success("Signed out");
    navigate("/signin");
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/api/user/notifications/read", {});
      dispatch(markAllNotificationsReadState());
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await api.post("/api/user/notifications/read", { notificationId: n._id });
        dispatch(markNotificationReadState(n._id));
      }
    } catch {
      // ignore
    }
    setShowNotifs(false);

    if (n.orderId) {
      if (userData?.role === "deliveryBoy") {
        navigate("/");
      } else if (userData?.role === "owner") {
        navigate("/?tab=orders");
      } else {
        navigate(`/track-order/${n.orderId}`);
      }
    } else if (n.type === "order") {
      if (userData?.role === "deliveryBoy") {
        navigate("/");
      } else if (userData?.role === "owner") {
        navigate("/?tab=orders");
      } else {
        navigate("/my-orders");
      }
    } else if (n.type === "support") {
      navigate("/support");
    } else if (n.link) {
      navigate(n.link);
    } else {
      if (userData?.role === "user") navigate("/my-orders");
      else navigate("/");
    }
  };

  const handleCitySubmit = (e) => {
    e.preventDefault();
    if (cityInput.trim()) {
      dispatch(setCurrentCity(cityInput.trim()));
    }
    setEditingCity(false);
  };

  const isCustomer = !userData || userData.role === "user";

  return (
    <header className="w-full h-18 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 fixed top-0 left-0 z-50 no-print">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF4D2D] text-white flex items-center justify-center shadow-xs group-hover:bg-[#E63E20] transition">
              <FaUtensils size={16} />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Quick<span className="text-[#FF4D2D]">Bite</span>
            </span>
          </button>

          {userData?.role && userData.role !== "user" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF4D2D] border border-orange-200 capitalize">
              {userData.role === "deliveryBoy" ? "Delivery Partner" : userData.role}
            </span>
          )}
        </div>

        {/* Customer Location + Search Bar */}
        {isCustomer && (
          <div className="hidden md:flex flex-1 max-w-xl h-11 bg-[#F8F9FB] border border-slate-200 rounded-xl items-center px-3 gap-3 focus-within:border-[#FF4D2D] focus-within:bg-white transition">
            {editingCity ? (
              <form onSubmit={handleCitySubmit} className="flex items-center gap-1 w-36 border-r border-slate-200 pr-2">
                <FaLocationDot size={15} className="text-[#FF4D2D] shrink-0" />
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onBlur={handleCitySubmit}
                  autoFocus
                  className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none"
                  placeholder="City..."
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditingCity(true)}
                title="Click to change city"
                className="flex items-center gap-1.5 max-w-36 border-r border-slate-200 pr-3 text-left cursor-pointer hover:text-[#FF4D2D] transition"
              >
                <FaLocationDot size={15} className="text-[#FF4D2D] shrink-0" />
                <span className="truncate text-xs font-semibold text-slate-700">
                  {currentCity || "All Cities"}
                </span>
              </button>
            )}

            <div className="flex-1 flex items-center gap-2">
              <FaSearch size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search dishes, cuisines, or restaurants..."
                className="w-full text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <RxCross2 size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isCustomer && (
            <button
              type="button"
              onClick={() => setShowSearch((prev) => !prev)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle search"
            >
              {showSearch ? <RxCross2 size={20} /> : <FaSearch size={18} />}
            </button>
          )}

          {!userData ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/cart")}
                className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                aria-label="Cart"
              >
                <FaShoppingCart size={18} />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#FF4D2D] text-white text-[11px] font-bold flex items-center justify-center">
                    {totalCartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate("/signin")}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#FF4D2D] hover:bg-[#E63E20] text-white transition cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <>
              {userData.role === "owner" && (
                <>
                  {myShopData && (
                    <button
                      onClick={() => navigate("/add-item")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF4D2D] text-sm font-semibold transition cursor-pointer"
                    >
                      <FaPlus size={14} />
                      <span className="hidden sm:inline">Add Dish</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/my-orders")}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition cursor-pointer"
                  >
                    <TbReceiptRupeeFilled size={18} className="text-[#FF4D2D]" />
                    <span className="hidden sm:inline">Orders</span>
                    {activeOwnerOrdersCount > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-[#FF4D2D] text-white text-[11px] font-bold flex items-center justify-center">
                        {activeOwnerOrdersCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {userData.role === "user" && (
                <>
                  <button
                    onClick={() => navigate("/my-orders")}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <TbReceiptRupeeFilled size={18} className="text-[#FF4D2D]" />
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => navigate("/cart")}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF4D2D] font-semibold text-sm transition cursor-pointer"
                    aria-label="Shopping Cart"
                  >
                    <FaShoppingCart size={17} />
                    <span className="hidden sm:inline">Cart</span>
                    {totalCartCount > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#FF4D2D] text-white text-[11px] font-bold flex items-center justify-center">
                        {totalCartCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs((prev) => !prev)}
                  className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Notifications"
                >
                  <FaBell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FF4D2D] ring-2 ring-white" />
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-2.5 rounded-xl cursor-pointer transition flex items-start gap-2.5 group ${
                              !n.isRead ? "bg-orange-50/70 hover:bg-orange-100/60" : "hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                !n.isRead ? "bg-[#FF4D2D]" : "bg-slate-300"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p
                                  className={`text-xs font-semibold truncate ${
                                    !n.isRead ? "text-slate-900 font-bold" : "text-slate-700"
                                  }`}
                                >
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {n.createdAt
                                    ? new Date(n.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              {n.orderId && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-[#FF4D2D] group-hover:underline">
                                  Track Order →
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowInfo((prev) => !prev)}
                  className="w-9 h-9 rounded-full bg-[#FF4D2D] text-white font-bold text-sm flex items-center justify-center shadow-xs hover:bg-[#E63E20] transition cursor-pointer"
                  aria-label="Account menu"
                >
                  {userData?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </button>

                {showInfo && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {userData.fullName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{userData.email}</p>
                    </div>
                    <div className="py-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setShowInfo(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <FaUserCircle className="text-slate-400" />
                        <span>Profile & Saved Addresses</span>
                      </button>

                      {userData.role === "user" && (
                        <>
                          <button
                            onClick={() => {
                              setShowInfo(false);
                              navigate("/my-orders");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <TbReceiptRupeeFilled className="text-slate-400" />
                            <span>My Orders</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowInfo(false);
                              navigate("/profile?tab=favorites");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FaHeart className="text-slate-400" />
                            <span>Favorites</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setShowInfo(false);
                          navigate("/support");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <MdSupportAgent className="text-slate-400" />
                        <span>Help & Support</span>
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <FaSignOutAlt />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Drawer */}
      {showSearch && isCustomer && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shadow-sm">
          <button
            type="button"
            onClick={() => {
              const next = window.prompt("Enter your city:", currentCity || "Pune");
              if (next?.trim()) dispatch(setCurrentCity(next.trim()));
            }}
            className="flex items-center gap-1 text-xs font-semibold text-[#FF4D2D] border-r border-slate-200 pr-2 shrink-0"
          >
            <FaLocationDot />
            <span>{currentCity || "City"}</span>
          </button>
          <input
            type="text"
            placeholder="Search dishes or restaurants..."
            className="flex-1 text-sm outline-none text-slate-800"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400">
              <RxCross2 />
            </button>
          )}
        </div>
      )}
    </header>
  );
}

export default Nav;
