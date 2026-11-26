import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaClock, FaHeart, FaRegHeart, FaSearch, FaStar, FaStore } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import Nav from "../component/Nav";
import Footer from "../component/Footer";
import FoodCard from "../component/FoodCard";
import EmptyState from "../component/EmptyState";
import { CardSkeleton } from "../component/Skeletons";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setUserData } from "../redux/userslice";

function Shop() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [shop, setShop] = useState(null);
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => {
    let active = true;
    const fetchShop = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/item/get-by-shop/${shopId}`);
        if (active) {
          setShop(res.data.shop);
          setItems(res.data.items || []);
          setReviews(res.data.reviews || []);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "Restaurant not found"));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchShop();
    return () => {
      active = false;
    };
  }, [shopId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (vegFilter !== "all" && item.foodType !== vegFilter) return false;
      if (
        menuSearch.trim() &&
        !item.name.toLowerCase().includes(menuSearch.trim().toLowerCase()) &&
        !item.category?.toLowerCase().includes(menuSearch.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [items, vegFilter, menuSearch]);

  const isFav = userData?.favorites?.some(
    (f) => (typeof f === "object" ? f._id : f) === shop?._id,
  );

  const handleToggleFavorite = async () => {
    if (!userData) return toast.error("Sign in to save favorites");
    try {
      const res = await api.post(`/api/user/favorites/shop/${shop._id}`);
      dispatch(setUserData({ ...userData, favorites: res.data.favorites }));
      toast.success(res.data.isFavorite ? "Saved to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-22 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#FF4D2D] transition cursor-pointer"
        >
          <FaArrowLeft size={13} />
          <span>Back to Restaurants</span>
        </button>

        {loading ? (
          <CardSkeleton count={4} />
        ) : !shop ? (
          <EmptyState
            icon={<FaStore />}
            title="Restaurant not found"
            subtitle="This restaurant may no longer be available."
            actionLabel="Browse Restaurants"
            onAction={() => navigate("/")}
          />
        ) : (
          <>
            {/* Restaurant Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 h-60 md:h-72 bg-slate-100">
                <img
                  src={resolveImageUrl(shop.image)}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        shop.isOpen
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {shop.isOpen ? "Open for Delivery" : "Currently Closed"}
                    </span>
                    {userData?.role === "user" && (
                      <button
                        onClick={handleToggleFavorite}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#FF4D2D] cursor-pointer"
                      >
                        {isFav ? <FaHeart className="text-[#FF4D2D]" /> : <FaRegHeart />}
                        <span>{isFav ? "Saved" : "Save"}</span>
                      </button>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {shop.name}
                  </h1>
                  {shop.description && (
                    <p className="text-sm text-slate-500 mt-2">{shop.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                      <FaStar className="text-amber-500" />
                      {shop.rating?.average ? `${Number(shop.rating.average).toFixed(1)} (${shop.rating.count} ratings)` : "New Restaurant"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FaClock className="text-[#FF4D2D]" />
                      {shop.deliveryTime || "25-35 mins"} • {shop.openingTime} - {shop.closingTime}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                  <FaLocationDot className="text-[#FF4D2D] shrink-0" />
                  <span>
                    {shop.address}, {shop.city}, {shop.state}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: "All Items" },
                  { id: "veg", label: "Pure Veg" },
                  { id: "non veg", label: "Non-Veg" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVegFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      vegFilter === tab.id
                        ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-[#F8F9FB] border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-72">
                <FaSearch size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search inside menu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full text-sm bg-transparent outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Menu Items */}
            {filteredItems.length === 0 ? (
              <EmptyState
                title="No dishes found"
                subtitle="Try clearing your search or filter to view all menu items."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredItems.map((item) => (
                  <FoodCard key={item._id} data={{ ...item, shop }} />
                ))}
              </div>
            )}

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <section className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Customer Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="p-4 rounded-xl bg-[#F8F9FB] border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900">
                          {rev.user?.fullName || "Verified Customer"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold">
                          {rev.rating} <FaStar size={10} />
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5">Dish: {rev.item?.name}</p>
                      {rev.comment && <p className="text-sm text-slate-600">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Shop;
