import React, { useEffect, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaLocationDot } from "react-icons/fa6";
import { FaMobileAlt, FaSearch, FaTag } from "react-icons/fa";
import { TbCurrentLocation } from "react-icons/tb";
import { MdDeliveryDining } from "react-icons/md";
import { CiCreditCard1 } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";

import Nav from "../component/Nav";
import Footer from "../component/Footer";
import { api, getErrorMessage } from "../api/client";
import { setAddress, setLocation } from "../redux/mapSlice";
import { addMyOrder, clearCart } from "../redux/userslice";

// Fix default Leaflet marker icon paths in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ReCenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.lat && location?.lon) {
      map.setView([location.lat, location.lon], 16, { animate: true, duration: 0.3 });
    }
  }, [location?.lat, location?.lon, map]);
  return null;
}

function CheckOut() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const apiKey = import.meta.env.VITE_GIOAPIKEY;
  const { location, address } = useSelector((state) => state.map);
  const { cartItems, totalAmount, userData } = useSelector((state) => state.user);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [addressInput, setAddressInput] = useState(address || "");
  const [landmark, setLandmark] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [placing, setPlacing] = useState(false);

  const deliveryFee = totalAmount >= 499 || totalAmount === 0 ? 0 : 40;
  const taxAmount = Math.round(Math.max(0, totalAmount - discountAmount) * 0.05);
  const grandTotal = Math.max(1, totalAmount - discountAmount + deliveryFee + taxAmount);

  useEffect(() => {
    if (address && !addressInput) {
      setAddressInput(address);
    }
  }, [address]);

  useEffect(() => {
    if (userData?.savedAddresses?.length > 0 && !addressInput) {
      const def = userData.savedAddresses.find((a) => a.isDefault) || userData.savedAddresses[0];
      setAddressInput(def.text);
      setLandmark(def.landmark || "");
      dispatch(setLocation({ lat: def.latitude, lon: def.longitude }));
      dispatch(setAddress(def.text));
    }
  }, [userData?.savedAddresses]);

  const getAddressByLatLng = async (lat, lng) => {
    if (!apiKey) return;
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`,
      );
      const first = result?.data?.results?.[0];
      const resolved = first?.address_line2 || first?.formatted || "";
      if (resolved) {
        dispatch(setAddress(resolved));
        setAddressInput(resolved);
      }
    } catch {
      // ignore geocoding error
    }
  };

  const onDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng();
    dispatch(setLocation({ lat, lon: lng }));
    getAddressByLatLng(lat, lng);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser");
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        dispatch(setLocation({ lat, lon }));
        getAddressByLatLng(lat, lon);
        toast.success("Location updated from GPS");
      },
      () => toast.error("Unable to access GPS location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const getLatLngByAddress = async () => {
    if (!addressInput.trim()) return toast.error("Enter an address to search");
    if (!apiKey) return toast.error("Map search key not configured — drag pin on map instead");
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`,
      );
      const feat = result.data?.features?.[0];
      if (!feat) return toast.error("Address not found on map");
      const { lat, lon } = feat.properties;
      dispatch(setLocation({ lat, lon }));
      dispatch(setAddress(addressInput));
      toast.success("Map updated to searched address");
    } catch {
      toast.error("Failed to geocode address");
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return toast.error("Enter a coupon code");
    try {
      const res = await api.post("/api/order/validate-coupon", {
        code: couponInput.trim(),
        itemsSubtotal: totalAmount,
      });
      setAppliedCoupon(res.data.coupon);
      setDiscountAmount(res.data.discountAmount);
      toast.success(`Coupon ${res.data.coupon.code} applied! Saved ₹${res.data.discountAmount}`);
    } catch (err) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      toast.error(getErrorMessage(err, "Invalid coupon"));
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput("");
  };

  const openRazorpayWindow = (orderId, orderNumber, razorOrder) => {
    if (!window.Razorpay) {
      return toast.error("Razorpay checkout SDK failed to load. Please refresh.");
    }
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: razorOrder.amount,
      currency: razorOrder.currency || "INR",
      name: "QuickBite",
      description: `Order ${orderNumber}`,
      order_id: razorOrder.id,
      prefill: {
        name: userData?.fullName,
        email: userData?.email,
        contact: userData?.mobile,
      },
      handler: async function (response) {
        try {
          const result = await api.post("/api/order/verify-payment", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId,
          });
          dispatch(addMyOrder(result.data.order));
          dispatch(clearCart());
          toast.success("Payment verified & order placed!");
          navigate("/order-placed", { state: { order: result.data.order } });
        } catch (err) {
          toast.error(getErrorMessage(err, "Payment verification failed"));
        }
      },
      modal: {
        ondismiss: async () => {
          try {
            await api.post("/api/order/payment-failed", { orderId });
          } catch {
            // ignore
          }
          toast.error("Payment cancelled");
        },
      },
      theme: { color: "#FF4D2D" },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", async () => {
      try {
        await api.post("/api/order/payment-failed", { orderId });
      } catch {
        // ignore
      }
      toast.error("Payment failed. Please try again.");
    });
    rzp.open();
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      return toast.error("Your cart is empty");
    }
    if (!addressInput.trim() || !location?.lat || !location?.lon) {
      return toast.error("Please provide a delivery address and pin your location");
    }

    setPlacing(true);
    try {
      const result = await api.post("/api/order/place-order", {
        paymentMethod,
        deliveryAddress: {
          text: addressInput.trim(),
          landmark: landmark.trim(),
          latitude: location.lat,
          longitude: location.lon,
        },
        couponCode: appliedCoupon?.code || "",
        cartItems,
      });

      if (paymentMethod === "cod") {
        dispatch(addMyOrder(result.data.order));
        dispatch(clearCart());
        toast.success("Order placed successfully!");
        navigate("/order-placed", { state: { order: result.data.order } });
      } else {
        openRazorpayWindow(
          result.data.orderId,
          result.data.orderNumber,
          result.data.razorOrder,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to place order"));
    } finally {
      setPlacing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-slate-500 mb-5">Add dishes to your cart before checking out.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl bg-[#FF4D2D] text-white font-semibold cursor-pointer"
          >
            Explore Food
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/cart")}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#FF4D2D] cursor-pointer"
          >
            <IoIosArrowRoundBack size={24} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Address & Payment */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Address Card */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaLocationDot className="text-[#FF4D2D]" />
                  <span>Delivery Address</span>
                </h2>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
                >
                  <TbCurrentLocation size={15} />
                  <span>Use Current GPS</span>
                </button>
              </div>

              {/* Saved Addresses */}
              {userData?.savedAddresses?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {userData.savedAddresses.map((addr) => (
                    <button
                      key={addr._id}
                      type="button"
                      onClick={() => {
                        setAddressInput(addr.text);
                        setLandmark(addr.landmark || "");
                        dispatch(setLocation({ lat: addr.latitude, lon: addr.longitude }));
                        dispatch(setAddress(addr.text));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        addressInput === addr.text
                          ? "bg-orange-50 border-[#FF4D2D] text-[#FF4D2D]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {addr.label}: {addr.text.slice(0, 28)}...
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF4D2D]"
                  placeholder="Enter full street address, flat / building..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={getLatLngByAddress}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
                  title="Locate on map"
                >
                  <FaSearch size={14} />
                </button>
              </div>

              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#FF4D2D]"
                placeholder="Landmark / delivery instructions (optional)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />

              <div className="rounded-xl border border-slate-200 overflow-hidden h-60">
                {location?.lat && location?.lon && (
                  <MapContainer
                    style={{ height: "100%", width: "100%" }}
                    center={[location.lat, location.lon]}
                    zoom={16}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ReCenterMap location={location} />
                    <Marker
                      position={[location.lat, location.lon]}
                      draggable
                      eventHandlers={{ dragend: onDragEnd }}
                    />
                  </MapContainer>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Tip: Drag the map pin to adjust your exact delivery doorstep.
              </p>
            </section>

            {/* Payment Method */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                    paymentMethod === "cod"
                      ? "border-[#FF4D2D] bg-orange-50/60"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MdDeliveryDining size={22} />
                  </span>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Cash on Delivery</p>
                    <p className="text-xs text-slate-500">Pay via cash/UPI at doorstep</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                    paymentMethod === "online"
                      ? "border-[#FF4D2D] bg-orange-50/60"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <CiCreditCard1 size={22} />
                  </span>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Pay Online (Razorpay)</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <FaMobileAlt size={10} /> UPI, Cards, NetBanking
                    </p>
                  </div>
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Coupon & Order Summary */}
          <div className="lg:col-span-5 space-y-5">
            {/* Coupon Box */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FaTag className="text-[#FF4D2D]" />
                <span>Apply Promo Coupon</span>
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{appliedCoupon.code} Applied</p>
                    <p className="text-xs text-emerald-700">You saved ₹{discountAmount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-sm uppercase focus:outline-none focus:border-[#FF4D2D]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </section>

            {/* Bill Summary */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-700">
                    <span className="truncate pr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">₹{totalAmount}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon Discount</span>
                    <span className="font-semibold tabular-nums">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Charges (5% GST)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">₹{taxAmount}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-900">Grand Total</span>
                <span className="text-xl font-extrabold text-[#FF4D2D] tabular-nums">
                  ₹{grandTotal}
                </span>
              </div>

              <button
                type="button"
                disabled={placing}
                onClick={handlePlaceOrder}
                className="w-full bg-[#FF4D2D] hover:bg-[#E63E20] text-white py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center cursor-pointer disabled:opacity-60"
              >
                {placing ? (
                  <ClipLoader size={18} color="white" />
                ) : paymentMethod === "cod" ? (
                  `Place Order • ₹${grandTotal}`
                ) : (
                  `Pay ₹${grandTotal} Online`
                )}
              </button>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CheckOut;
