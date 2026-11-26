import React from "react";

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden animate-pulse"
        >
          <div className="h-44 bg-slate-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 bg-slate-200 rounded w-16" />
              <div className="h-8 bg-slate-200 rounded-lg w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoader({ label = "Loading QuickBite..." }) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3 p-6">
      <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-[#FF4D2D] animate-spin" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
