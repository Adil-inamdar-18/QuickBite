import React from "react";

function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-10 text-center flex flex-col items-center justify-center shadow-2xs">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF4D2D] flex items-center justify-center mb-4 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 max-w-md mb-5">{subtitle}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-semibold transition cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
