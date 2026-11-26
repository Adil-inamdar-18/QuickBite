import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPen, FaTrash } from "react-icons/fa";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setMyShopData } from "../redux/ownerSlice";

function OwnerItemCard({ data }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleDeleteItem = async () => {
    if (!window.confirm(`Delete "${data.name}" from your menu?`)) return;
    try {
      const result = await api.delete(`/api/item/delete/${data._id}`);
      dispatch(setMyShopData(result.data.shop));
      toast.success("Dish deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete dish"));
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const result = await api.patch(`/api/item/toggle-availability/${data._id}`);
      dispatch(setMyShopData(result.data.shop));
      toast.success(
        result.data.item.isAvailable ? "Marked as Available" : "Marked as Out of Stock",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update availability"));
    }
  };

  return (
    <div className="flex bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden hover:shadow-md transition">
      <div className="w-32 sm:w-36 shrink-0 bg-slate-100 relative">
        <img
          src={resolveImageUrl(data.image)}
          alt={data.name}
          className={`w-full h-full object-cover ${
            data.isAvailable === false ? "grayscale opacity-60" : ""
          }`}
        />
      </div>

      <div className="flex flex-col justify-between p-4 flex-1 min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 truncate">{data.name}</h3>
            <span
              className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 mt-1 ${
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
          <p className="text-xs text-slate-500 mt-0.5">{data.category}</p>
          {data.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{data.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100">
          <div className="text-slate-900 font-extrabold text-base tabular-nums">
            ₹{data.price}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleAvailability}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                data.isAvailable !== false
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {data.isAvailable !== false ? "In Stock" : "Out of Stock"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/edit-item/${data._id}`)}
              className="p-2 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-[#FF4D2D] transition cursor-pointer"
              title="Edit dish"
            >
              <FaPen size={13} />
            </button>
            <button
              type="button"
              onClick={handleDeleteItem}
              className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
              title="Delete dish"
            >
              <FaTrash size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerItemCard;
