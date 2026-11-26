import React from "react";
import { FaHeart, FaMinus, FaPlus, FaRegHeart, FaStar } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { addToCart, setUserData, updateQuantity } from "../redux/userslice";

function FoodCard({ data }) {
  const dispatch = useDispatch();
  const { cartItems, cartShopId, cartShopName, userData } = useSelector((state) => state.user);

  const shopObj = typeof data.shop === "object" ? data.shop : null;
  const shopId = shopObj?._id || data.shop;
  const shopName = shopObj?.name || "Restaurant";
  const shopIsOpen = shopObj?.isOpen !== false;
  const isAvailable = data.isAvailable !== false && shopIsOpen;

  const cartItem = cartItems.find((i) => i.id === data._id);
  const currentQty = cartItem?.quantity || 0;

  const isFavorite = userData?.favoriteItems?.some(
    (fav) => (typeof fav === "object" ? fav._id : fav) === data._id,
  );

  const handleAdd = (replaceCart = false) => {
    if (!isAvailable) {
      return toast.error(shopIsOpen ? "This dish is currently unavailable" : `${shopName} is currently closed`);
    }
    if (cartItems.length > 0 && cartShopId && shopId && cartShopId !== shopId && !replaceCart) {
      const confirmed = window.confirm(
        `Your cart contains items from ${cartShopName || "another restaurant"}. Replace cart with items from ${shopName}?`,
      );
      if (!confirmed) return;
      replaceCart = true;
    }

    dispatch(
      addToCart({
        id: data._id,
        name: data.name,
        price: data.price,
        image: data.image,
        shop: shopId,
        shopName,
        quantity: 1,
        foodType: data.foodType,
        replaceCart,
      }),
    );
    toast.success(`Added ${data.name} to cart`);
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    if (!userData) return toast.error("Please sign in to save favorites");
    try {
      const res = await api.post(`/api/user/favorites/item/${data._id}`);
      dispatch(setUserData({ ...userData, favoriteItems: res.data.favoriteItems }));
      toast.success(res.data.isFavorite ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        <img
          src={resolveImageUrl(data.image)}
          alt={data.name}
          className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
            !isAvailable ? "grayscale opacity-70" : ""
          }`}
        />

        {/* Veg / Non-Veg Symbol */}
        <div
          title={data.foodType === "veg" ? "Vegetarian" : "Non-Vegetarian"}
          className="absolute top-3 left-3 bg-white/95 p-1 rounded-md shadow-xs border border-slate-200"
        >
          <span
            className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center ${
              data.foodType === "veg" ? "border-emerald-600" : "border-red-600"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                data.foodType === "veg" ? "bg-emerald-600" : "bg-red-600"
              }`}
            />
          </span>
        </div>

        {/* Favorite Heart */}
        {userData?.role === "user" && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#FF4D2D] transition cursor-pointer"
            aria-label="Toggle favorite dish"
          >
            {isFavorite ? <FaHeart className="text-[#FF4D2D]" size={14} /> : <FaRegHeart size={14} />}
          </button>
        )}

        {!isAvailable && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/75 text-white text-xs font-semibold py-1.5 text-center">
            {shopIsOpen ? "Currently Unavailable" : "Restaurant Closed"}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
            {data.name}
          </h3>
          {data.rating?.count > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold">
              {Number(data.rating.average).toFixed(1)}
              <FaStar size={10} />
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {shopObj?.name ? `${shopObj.name} • ` : ""}
          {data.category}
        </p>

        {data.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{data.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="text-base font-extrabold text-slate-900 tabular-nums">
            ₹{data.price}
          </span>

          {currentQty === 0 ? (
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => handleAdd(false)}
              className="px-4 py-1.5 rounded-xl bg-orange-50 border border-[#FF4D2D] text-[#FF4D2D] hover:bg-[#FF4D2D] hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              + ADD
            </button>
          ) : (
            <div className="inline-flex items-center rounded-xl bg-[#FF4D2D] text-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => dispatch(updateQuantity({ id: data._id, quantity: currentQty - 1 }))}
                className="px-2.5 py-1.5 hover:bg-[#E63E20] transition cursor-pointer"
                aria-label="Decrease quantity"
              >
                <FaMinus size={11} />
              </button>
              <span className="px-2.5 text-xs font-bold tabular-nums">{currentQty}</span>
              <button
                type="button"
                onClick={() => dispatch(updateQuantity({ id: data._id, quantity: currentQty + 1 }))}
                className="px-2.5 py-1.5 hover:bg-[#E63E20] transition cursor-pointer"
                aria-label="Increase quantity"
              >
                <FaPlus size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
