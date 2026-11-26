import React from "react";
import { FaMinus, FaPlus, FaTrash } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { removeCartItem, updateQuantity } from "../redux/userslice";
import { resolveImageUrl } from "../api/client";

function CartItemCard({ data }) {
  const dispatch = useDispatch();

  return (
    <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div className="flex items-center gap-4 min-w-0">
        <img
          src={resolveImageUrl(data.image)}
          alt={data.name}
          className="w-18 h-18 object-cover rounded-xl border border-slate-100 shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                data.foodType === "veg" ? "border-emerald-600" : "border-red-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  data.foodType === "veg" ? "bg-emerald-600" : "bg-red-600"
                }`}
              />
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
              {data.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ₹{data.price} × {data.quantity}
          </p>
          <p className="font-bold text-slate-900 text-sm mt-1 tabular-nums">
            ₹{data.price * data.quantity}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50">
          <button
            type="button"
            className="p-2 text-slate-700 hover:bg-slate-200/60 rounded-l-xl cursor-pointer transition"
            onClick={() => dispatch(updateQuantity({ id: data.id, quantity: data.quantity - 1 }))}
            aria-label="Decrease quantity"
          >
            <FaMinus size={11} />
          </button>
          <span className="px-3 text-sm font-bold text-slate-900 tabular-nums">
            {data.quantity}
          </span>
          <button
            type="button"
            className="p-2 text-slate-700 hover:bg-slate-200/60 rounded-r-xl cursor-pointer transition"
            onClick={() => dispatch(updateQuantity({ id: data.id, quantity: data.quantity + 1 }))}
            aria-label="Increase quantity"
          >
            <FaPlus size={11} />
          </button>
        </div>

        <button
          type="button"
          className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 cursor-pointer transition"
          onClick={() => dispatch(removeCartItem(data.id))}
          aria-label="Remove item"
        >
          <FaTrash size={14} />
        </button>
      </div>
    </div>
  );
}

export default CartItemCard;
