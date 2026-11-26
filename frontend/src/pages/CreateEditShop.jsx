import React, { useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import Nav from "../component/Nav";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setMyShopData } from "../redux/ownerSlice";

function CreateEditShop() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { myShopData } = useSelector((state) => state.owner);
  const { currentCity, currentState, currentAddress } = useSelector((state) => state.user);
  const { location } = useSelector((state) => state.map);

  const [name, setName] = useState(myShopData?.name || "");
  const [description, setDescription] = useState(myShopData?.description || "");
  const [cuisines, setCuisines] = useState(myShopData?.cuisines?.join(", ") || "");
  const [phone, setPhone] = useState(myShopData?.phone || "");
  const [openingTime, setOpeningTime] = useState(myShopData?.openingTime || "09:00");
  const [closingTime, setClosingTime] = useState(myShopData?.closingTime || "23:00");
  const [deliveryTime, setDeliveryTime] = useState(myShopData?.deliveryTime || "25-35 mins");
  const [minOrderAmount, setMinOrderAmount] = useState(myShopData?.minOrderAmount || 0);
  const [address, setAddress] = useState(myShopData?.address || currentAddress || "");
  const [city, setCity] = useState(myShopData?.city || currentCity || "");
  const [state, setState] = useState(myShopData?.state || currentState || "");
  const [frontendImage, setFrontendImage] = useState(
    myShopData?.image ? resolveImageUrl(myShopData.image) : null,
  );
  const [backendImage, setBackendImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myShopData && !backendImage) {
      return toast.error("Please upload a restaurant cover image");
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("cuisines", cuisines);
      formData.append("phone", phone);
      formData.append("openingTime", openingTime);
      formData.append("closingTime", closingTime);
      formData.append("deliveryTime", deliveryTime);
      formData.append("minOrderAmount", minOrderAmount);
      formData.append("city", city);
      formData.append("state", state);
      formData.append("address", address);
      if (location?.lat && location?.lon) {
        formData.append("latitude", location.lat);
        formData.append("longitude", location.lon);
      }
      if (backendImage) {
        formData.append("image", backendImage);
      }

      const result = await api.post("/api/shop/create-edit", formData);
      dispatch(setMyShopData(result.data.shop));
      toast.success(myShopData ? "Restaurant updated" : "Restaurant registered!");
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save restaurant"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />
      <main className="flex-1 pt-24 pb-12 px-4 flex justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-[#FF4D2D] cursor-pointer"
            >
              <IoIosArrowRoundBack size={24} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF4D2D] flex items-center justify-center">
                <FaUtensils />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {myShopData ? "Edit Restaurant Profile" : "Register Restaurant"}
              </h1>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Restaurant Name *
                </label>
                <input
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  type="text"
                  placeholder="Spice Garden Kitchen"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  onChange={(e) => setPhone(e.target.value)}
                  value={phone}
                  type="tel"
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Authentic regional dishes made fresh daily..."
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF4D2D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cuisines (comma separated)
                </label>
                <input
                  onChange={(e) => setCuisines(e.target.value)}
                  value={cuisines}
                  type="text"
                  placeholder="North Indian, Biryani, Chinese"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estimated Delivery Time
                </label>
                <input
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  value={deliveryTime}
                  type="text"
                  placeholder="25-35 mins"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opens At</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Closes At</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Order (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cover Image {!myShopData && "*"}
              </label>
              <input
                onChange={handleImage}
                type="file"
                accept="image/*"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
              {frontendImage && (
                <img
                  src={frontendImage}
                  alt="Restaurant preview"
                  className="mt-3 w-full h-44 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                <input
                  onChange={(e) => setCity(e.target.value)}
                  value={city}
                  type="text"
                  placeholder="Pune"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                <input
                  onChange={(e) => setState(e.target.value)}
                  value={state}
                  type="text"
                  placeholder="Maharashtra"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Address *
              </label>
              <input
                onChange={(e) => setAddress(e.target.value)}
                value={address}
                type="text"
                placeholder="Shop 12, FC Road, Shivajinagar"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white py-3 rounded-xl font-bold text-sm transition flex justify-center cursor-pointer disabled:opacity-60"
            >
              {loading ? <ClipLoader size={18} color="white" /> : "Save Restaurant"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CreateEditShop;
