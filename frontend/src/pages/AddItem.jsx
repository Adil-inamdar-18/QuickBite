import React, { useEffect, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import Nav from "../component/Nav";
import { api, getErrorMessage } from "../api/client";
import { setMyShopData } from "../redux/ownerSlice";

const FALLBACK_CATEGORIES = [
  "Pizza",
  "Burger",
  "Biryani",
  "Chinese",
  "South Indian",
  "North Indian",
  "Fast Food",
  "Desserts",
  "Ice Cream",
  "Beverages",
  "Bakery",
  "Sandwich",
  "Rolls",
  "Pasta",
  "Momos",
  "Street Food",
  "Healthy Food",
  "Seafood",
  "Vegetarian",
  "Non Vegetarian",
];

function AddItem() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [foodType, setFoodType] = useState("veg");
  const [preparationTime, setPreparationTime] = useState(15);
  const [isAvailable, setIsAvailable] = useState(true);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/api/item/categories")
      .then((res) => {
        const list = res.data?.categories?.map((c) => c.name);
        if (list?.length) setCategories(list);
      })
      .catch(() => {});
  }, []);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!backendImage) return toast.error("Please select a dish image");
    if (!category) return toast.error("Please select a category");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("foodType", foodType);
      formData.append("price", price);
      formData.append("preparationTime", preparationTime);
      formData.append("isAvailable", isAvailable);
      formData.append("image", backendImage);

      const result = await api.post("/api/item/add-item", formData);
      dispatch(setMyShopData(result.data.shop));
      toast.success("Dish added to menu!");
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to add dish"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />
      <main className="flex-1 pt-24 pb-12 px-4 flex justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
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
              <h1 className="text-2xl font-bold text-slate-900">Add New Dish</h1>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dish Name *</label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                type="text"
                placeholder="Paneer Butter Masala"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rich creamy tomato gravy with soft cottage cheese cubes..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dish Image *</label>
              <input
                onChange={handleImage}
                type="file"
                accept="image/*"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                required
              />
              {frontendImage && (
                <img
                  src={frontendImage}
                  alt="Preview"
                  className="mt-3 w-full h-44 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) *</label>
                <input
                  onChange={(e) => setPrice(e.target.value)}
                  value={price}
                  type="number"
                  min="0"
                  placeholder="249"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prep Time (mins)</label>
                <input
                  onChange={(e) => setPreparationTime(e.target.value)}
                  value={preparationTime}
                  type="number"
                  min="1"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  onChange={(e) => setCategory(e.target.value)}
                  value={category}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cate) => (
                    <option value={cate} key={cate}>
                      {cate}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Food Type *</label>
                <select
                  onChange={(e) => setFoodType(e.target.value)}
                  value={foodType}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#FF4D2D]"
                >
                  <option value="veg">Veg</option>
                  <option value="non veg">Non-Veg</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="accent-[#FF4D2D]"
              />
              <span>Available for ordering immediately</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white py-3 rounded-xl font-bold text-sm transition flex justify-center cursor-pointer disabled:opacity-60"
            >
              {loading ? <ClipLoader size={18} color="white" /> : "Add Dish"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddItem;
