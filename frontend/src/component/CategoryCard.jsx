import React from "react";
import { resolveImageUrl } from "../api/client";

function CategoryCard({ name, image, active = false, subtitle = "", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-200 cursor-pointer ${
        active ? "scale-105" : "hover:scale-105"
      }`}
    >
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden p-0.5 transition-all duration-300 ${
          active
            ? "ring-3 ring-[#FF4D2D] ring-offset-2 shadow-lg bg-orange-50"
            : "ring-1 ring-slate-200/90 hover:ring-orange-300 hover:shadow-md bg-white"
        }`}
      >
        <img
          src={resolveImageUrl(image)}
          alt={name}
          className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
        />
      </div>
      <span
        className={`text-xs sm:text-sm font-semibold tracking-tight text-center max-w-[90px] truncate ${
          active ? "text-[#FF4D2D] font-bold" : "text-slate-700 group-hover:text-slate-900"
        }`}
      >
        {name}
      </span>
      {subtitle && (
        <span className="text-[10px] text-slate-400 truncate max-w-[80px] text-center -mt-1.5">
          {subtitle}
        </span>
      )}
    </button>
  );
}

export default CategoryCard;

