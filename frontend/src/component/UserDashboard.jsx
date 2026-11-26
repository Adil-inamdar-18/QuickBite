import React, { useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaClock,
  FaHeart,
  FaRegHeart,
  FaSlidersH,
  FaStar,
  FaStore,
} from "react-icons/fa";
import toast from "react-hot-toast";

import Nav from "./Nav";
import Footer from "./Footer";
import CategoryCard from "./CategoryCard";
import FoodCard from "./FoodCard";
import EmptyState from "./EmptyState";
import { categories } from "../category";
import heroImg from "../assets/hero.png";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setCurrentCity, setUserData } from "../redux/userslice";

function UserDashboard() {
  const {
    userData,
    currentCity,
    shopInMyCity,
    itemsInMyCity,
    searchItems,
    searchShops,
  } = useSelector((state) => state.user);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cateScrollRef = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [foodTypeFilter, setFoodTypeFilter] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [openOnly, setOpenOnly] = useState(false);

  const scrollCategories = (dir) => {
    cateScrollRef.current?.scrollBy({
      left: dir === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  const filteredShops = useMemo(() => {
    return (shopInMyCity || []).filter((shop) => {
      if (openOnly && !shop.isOpen) return false;
      if (minRating > 0 && (shop.rating?.average || 0) < minRating) return false;
      return true;
    });
  }, [shopInMyCity, openOnly, minRating]);

  const filteredItems = useMemo(() => {
    let list = [...(itemsInMyCity || [])];
    if (selectedCategory !== "All") {
      list = list.filter(
        (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    if (foodTypeFilter !== "all") {
      list = list.filter((item) => item.foodType === foodTypeFilter);
    }
    if (minRating > 0) {
      list = list.filter((item) => (item.rating?.average || 0) >= minRating);
    }
    if (maxPrice !== "" && !Number.isNaN(Number(maxPrice))) {
      list = list.filter((item) => Number(item.price) <= Number(maxPrice));
    }

    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") list.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));

    return list;
  }, [itemsInMyCity, selectedCategory, foodTypeFilter, minRating, maxPrice, sortBy]);

  const handleToggleFavShop = async (e, shopId) => {
    e.stopPropagation();
    if (!userData) return toast.error("Please sign in to save favorite restaurants");
    try {
      const res = await api.post(`/api/user/favorites/shop/${shopId}`);
      dispatch(setUserData({ ...userData, favorites: res.data.favorites }));
      toast.success(res.data.isFavorite ? "Restaurant saved to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const isSearchActive = Array.isArray(searchItems);

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-22 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Search Results Section */}
        {isSearchActive && (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">
                Search Results ({searchItems.length} dishes
                {searchShops?.length > 0 ? `, ${searchShops.length} restaurants` : ""})
              </h2>
            </div>

            {searchShops?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchShops.map((shop) => (
                  <div
                    key={shop._id}
                    onClick={() => navigate(`/shop/${shop._id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#FF4D2D] cursor-pointer transition"
                  >
                    <img
                      src={resolveImageUrl(shop.image)}
                      alt={shop.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{shop.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{shop.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchItems.length === 0 ? (
              <EmptyState
                title="No matching dishes found"
                subtitle="Try searching with a different keyword or switching city."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {searchItems.map((item) => (
                  <FoodCard data={item} key={item._id} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Hero Banner */}
        <section className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-[#FF4D2D] text-xs font-bold border border-orange-200/70">
              Free delivery on orders above ₹499
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Craving something <span className="text-[#FF4D2D]">delicious</span> in{" "}
              {currentCity || "your city"}?
            </h1>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl">
              Discover top-rated local restaurants, fresh chef specials, and lightning-fast doorstep delivery with live order tracking.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => document.getElementById("restaurants-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white font-semibold text-sm transition cursor-pointer"
              >
                Explore Restaurants
              </button>
              <button
                onClick={() => dispatch(setCurrentCity("all"))}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                Browse All Cities
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 h-64 sm:h-80 lg:h-full min-h-[300px] bg-gradient-to-br from-orange-100 to-amber-50 overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"
              alt="Fresh gourmet meal feast"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = heroImg;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
          </div>
        </section>

        {/* Categories Strip */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                What&apos;s on your mind?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Browse curated dishes by category
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCategories("left")}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-[#FF4D2D] hover:text-[#FF4D2D] transition cursor-pointer"
                aria-label="Scroll categories left"
              >
                <FaArrowLeft size={13} />
              </button>
              <button
                onClick={() => scrollCategories("right")}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-[#FF4D2D] hover:text-[#FF4D2D] transition cursor-pointer"
                aria-label="Scroll categories right"
              >
                <FaArrowRight size={13} />
              </button>
            </div>
          </div>

          <div
            ref={cateScrollRef}
            className="flex gap-3.5 overflow-x-auto scrollbar-hide pb-2"
          >
            {categories.map((cate) => (
              <CategoryCard
                key={cate.category}
                name={cate.category}
                image={cate.image}
                active={selectedCategory === cate.category}
                onClick={() => setSelectedCategory(cate.category)}
              />
            ))}
          </div>
        </section>

        {/* Restaurants Section */}
        <section id="restaurants-section" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Restaurants {currentCity && currentCity !== "all" ? `in ${currentCity}` : "Across All Cities"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {filteredShops.length} restaurant{filteredShops.length === 1 ? "" : "s"} available
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="accent-[#FF4D2D]"
              />
              <span>Open Now Only</span>
            </label>
          </div>

          {filteredShops.length === 0 ? (
            <EmptyState
              icon={<FaStore />}
              title={`No restaurants found${currentCity && currentCity !== "all" ? ` in ${currentCity}` : ""}`}
              subtitle="Try viewing restaurants across all cities or clearing your filters."
              actionLabel="Show All Cities"
              onAction={() => {
                setOpenOnly(false);
                dispatch(setCurrentCity("all"));
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShops.map((shop) => {
                const isFav = userData?.favorites?.some(
                  (f) => (typeof f === "object" ? f._id : f) === shop._id,
                );
                return (
                  <div
                    key={shop._id}
                    onClick={() => navigate(`/shop/${shop._id}`)}
                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col"
                  >
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={resolveImageUrl(shop.image)}
                        alt={shop.name}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          !shop.isOpen ? "grayscale opacity-75" : ""
                        }`}
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                            shop.isOpen
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-800 text-white"
                          }`}
                        >
                          {shop.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      {userData?.role === "user" && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavShop(e, shop._id)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#FF4D2D] transition cursor-pointer"
                          aria-label="Favorite restaurant"
                        >
                          {isFav ? <FaHeart className="text-[#FF4D2D]" size={14} /> : <FaRegHeart size={14} />}
                        </button>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                          {shop.name}
                        </h3>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          {shop.rating?.average ? Number(shop.rating.average).toFixed(1) : "New"}
                          <FaStar size={10} />
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {shop.cuisines?.length > 0 ? shop.cuisines.join(", ") : `${shop.city}, ${shop.state}`}
                      </p>

                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <FaClock className="text-[#FF4D2D]" />
                          {shop.deliveryTime || "25-35 mins"}
                        </span>
                        <span>
                          {shop.openingTime || "09:00"} – {shop.closingTime || "23:00"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Filter & Menu Discovery Section */}
        <section className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FaSlidersH className="text-[#FF4D2D]" />
              <h2 className="text-lg font-bold text-slate-900">
                {selectedCategory === "All" ? "Popular Dishes" : `${selectedCategory} Dishes`}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                ({filteredItems.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Veg / Non-Veg Pills */}
              {[
                { id: "all", label: "All" },
                { id: "veg", label: "Pure Veg" },
                { id: "non veg", label: "Non-Veg" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFoodTypeFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    foodTypeFilter === opt.id
                      ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#FF4D2D]"
              >
                <option value={0}>Any Rating</option>
                <option value={4}>Rating 4.0+</option>
                <option value={4.5}>Rating 4.5+</option>
              </select>

              <input
                type="number"
                min="0"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#FF4D2D]"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#FF4D2D]"
              >
                <option value="popular">Sort: Popular</option>
                <option value="rating">Top Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              title="No dishes match your filters"
              subtitle="Try adjusting the category, price cap, or food preference."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedCategory("All");
                setFoodTypeFilter("all");
                setMinRating(0);
                setMaxPrice("");
                setSortBy("popular");
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredItems.map((item) => (
                <FoodCard key={item._id} data={item} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default UserDashboard;
