import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaCheck,
  FaHeart,
  FaLock,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { TbCurrentLocation } from "react-icons/tb";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import toast from "react-hot-toast";

import Nav from "../component/Nav";
import Footer from "../component/Footer";
import EmptyState from "../component/EmptyState";
import { api, getErrorMessage, resolveImageUrl } from "../api/client";
import { setCurrentCity, setUserData } from "../redux/userslice";

// Fix default Leaflet marker icon paths in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapRecenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], 16, { animate: true });
    }
  }, [lat, lon, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ProfilePage() {
  const { userData, currentCity } = useSelector((state) => state.user);
  const { location } = useSelector((state) => state.map);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [mobile, setMobile] = useState(userData?.mobile || "");
  const [vehicleType, setVehicleType] = useState(userData?.vehicleInfo?.type || "Bike");
  const [vehicleNumber, setVehicleNumber] = useState(userData?.vehicleInfo?.number || "");
  const [saving, setSaving] = useState(false);

  // Map state for all users
  const initialLat =
    userData?.location?.coordinates?.[1] || location?.lat || 18.5204;
  const initialLon =
    userData?.location?.coordinates?.[0] || location?.lon || 73.8567;

  const [mapLat, setMapLat] = useState(initialLat);
  const [mapLon, setMapLon] = useState(initialLon);
  const [mapAddress, setMapAddress] = useState("");
  const [mapCity, setMapCity] = useState(currentCity || "Nashik");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [alsoSaveAsAddress, setAlsoSaveAsAddress] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Saved Addresses state
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrText, setAddrText] = useState("");
  const [addrLandmark, setAddrLandmark] = useState("");

  useEffect(() => {
    if (userData) {
      setFullName(userData.fullName || "");
      setMobile(userData.mobile || "");
      setVehicleType(userData.vehicleInfo?.type || "Bike");
      setVehicleNumber(userData.vehicleInfo?.number || "");
      if (userData.location?.coordinates?.length === 2) {
        setMapLon(userData.location.coordinates[0]);
        setMapLat(userData.location.coordinates[1]);
      }
    }
  }, [userData]);

  // Reverse geocode whenever coordinates change
  const reverseGeocode = async (lat, lon) => {
    const apiKey = import.meta.env.VITE_GIOAPIKEY;
    if (apiKey) {
      try {
        const res = await axios.get(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`,
        );
        const first = res.data?.results?.[0];
        if (first) {
          const addr = first.address_line2 || first.formatted || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          const city = first.city || first.county || first.state || "";
          setMapAddress(addr);
          if (city) setMapCity(city);
          return;
        }
      } catch {
        // Fallback to nominatim
      }
    }

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const d = res.data;
      const city =
        d?.address?.city ||
        d?.address?.town ||
        d?.address?.village ||
        d?.address?.state_district ||
        "";
      const addr = d?.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setMapAddress(addr);
      if (city) setMapCity(city);
    } catch {
      setMapAddress(`Selected coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  };

  useEffect(() => {
    reverseGeocode(mapLat, mapLon);
  }, []);

  const handleLocationSelect = (lat, lon) => {
    setMapLat(lat);
    setMapLon(lon);
    reverseGeocode(lat, lon);
  };

  const handleMarkerDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng();
    setMapLat(lat);
    setMapLon(lng);
    reverseGeocode(lat, lng);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser");
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setMapLat(lat);
        setMapLon(lon);
        reverseGeocode(lat, lon);
        setIsLocating(false);
        toast.success("Map centered on your GPS position");
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to read GPS location. Click directly on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return toast.error("Type a city, area, or address to search");
    setIsSearching(true);
    const apiKey = import.meta.env.VITE_GIOAPIKEY;

    try {
      if (apiKey) {
        const res = await axios.get(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery.trim())}&apiKey=${apiKey}`,
        );
        const feat = res.data?.features?.[0];
        if (feat) {
          const { lat, lon, formatted, city } = feat.properties;
          setMapLat(lat);
          setMapLon(lon);
          setMapAddress(formatted || searchQuery);
          if (city) setMapCity(city);
          toast.success("Location found on map");
          return;
        }
      }

      // Nominatim search fallback
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.data?.[0]) {
        const item = res.data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        setMapLat(lat);
        setMapLon(lon);
        setMapAddress(item.display_name);
        toast.success("Location found on map");
      } else {
        toast.error("Location not found on map");
      }
    } catch {
      toast.error("Failed to search location");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveMapLocation = async () => {
    setSavingLocation(true);
    try {
      const res = await api.post("/api/user/update-location", {
        lat: mapLat,
        lon: mapLon,
        city: mapCity,
        address: mapAddress,
      });

      if (mapCity?.trim()) {
        dispatch(setCurrentCity(mapCity.trim()));
        localStorage.setItem("qb_city", mapCity.trim());
      }

      if (alsoSaveAsAddress && userData?.role === "user") {
        const addrRes = await api.post("/api/user/addresses", {
          label: "Pinned Location",
          text: mapAddress || `Location at ${mapLat.toFixed(4)}, ${mapLon.toFixed(4)}`,
          landmark: mapCity || "",
          latitude: mapLat,
          longitude: mapLon,
        });
        dispatch(
          setUserData({
            ...res.data.user,
            savedAddresses: addrRes.data.savedAddresses,
          }),
        );
      } else {
        dispatch(setUserData(res.data.user));
      }

      toast.success("Location saved to your profile!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/api/user/profile", {
        fullName,
        mobile,
        vehicleType,
        vehicleNumber,
      });
      dispatch(setUserData(res.data.user));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/user/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addrText.trim()) return toast.error("Enter an address");
    try {
      const res = await api.post("/api/user/addresses", {
        label: addrLabel,
        text: addrText,
        landmark: addrLandmark,
        latitude: mapLat,
        longitude: mapLon,
      });
      dispatch(setUserData({ ...userData, savedAddresses: res.data.savedAddresses }));
      setAddrText("");
      setAddrLandmark("");
      toast.success("Address saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const res = await api.delete(`/api/user/addresses/${addressId}`);
      dispatch(setUserData({ ...userData, savedAddresses: res.data.savedAddresses }));
      toast.success("Address removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      const res = await api.patch(`/api/user/addresses/${addressId}/default`);
      dispatch(setUserData({ ...userData, savedAddresses: res.data.savedAddresses }));
      toast.success("Default address updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <FaUser /> },
    { id: "map", label: "Location on Map", icon: <FaMapMarkerAlt /> },
    ...(userData?.role === "user"
      ? [
          { id: "addresses", label: "Saved Addresses", icon: <FaPlus /> },
          { id: "favorites", label: "Favorites", icon: <FaHeart /> },
        ]
      : []),
    { id: "security", label: "Security", icon: <FaLock /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-5xl w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF4D2D] text-white font-extrabold text-2xl flex items-center justify-center">
              {userData?.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{userData?.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF4D2D] border border-orange-200 capitalize">
                  {userData?.role === "deliveryBoy"
                    ? "Delivery Partner"
                    : userData?.role || "Customer"}
                </span>
              </div>
              <p className="text-sm text-slate-500">{userData?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  activeTab === t.id
                    ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 max-w-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Account Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>

            {userData?.role === "deliveryBoy" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                  >
                    <option value="Bike">Bike / Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="EV">Electric Two-Wheeler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="MH 12 AB 1234"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-bold cursor-pointer transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}

        {/* Tab 2: Location on Map (For EVERYONE) */}
        {activeTab === "map" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#FF4D2D]" />
                  <span>Select Your Location on Map</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click anywhere on the map or drag the pin to set your precise location.
                </p>
              </div>

              {userData?.role === "owner" && (
                <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                  🏪 Restaurant Location for Customer Orders
                </span>
              )}
              {userData?.role === "deliveryBoy" && (
                <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
                  🛵 Delivery Base for Order Assignment
                </span>
              )}
              {userData?.role === "user" && (
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  📍 Home / Delivery Drop Location
                </span>
              )}
            </div>

            {/* Search & GPS Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <form onSubmit={handleSearchLocation} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city, area, street, or landmark..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#FF4D2D] bg-[#F8F9FB]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleUseGps}
                disabled={isLocating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 text-[#FF4D2D] border border-orange-200 hover:bg-orange-100/70 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <TbCurrentLocation size={16} />
                <span>{isLocating ? "Detecting GPS..." : "Use Current GPS"}</span>
              </button>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 relative z-10 shadow-inner">
              <MapContainer
                center={[mapLat, mapLon]}
                zoom={15}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[mapLat, mapLon]}
                  draggable={true}
                  eventHandlers={{ dragend: handleMarkerDragEnd }}
                />
                <MapRecenter lat={mapLat} lon={mapLon} />
                <MapClickHandler onLocationSelect={handleLocationSelect} />
              </MapContainer>
            </div>

            {/* Selected Location Details Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-8">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Selected Address
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-snug">
                    {mapAddress || "Loading address..."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span>
                      City: <strong className="text-slate-700">{mapCity || "Unknown"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Coordinates:{" "}
                      <span className="font-mono text-slate-600">
                        {mapLat.toFixed(5)}, {mapLon.toFixed(5)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-4 flex flex-col sm:items-end gap-2">
                  {userData?.role === "user" && (
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoSaveAsAddress}
                        onChange={(e) => setAlsoSaveAsAddress(e.target.checked)}
                        className="accent-[#FF4D2D]"
                      />
                      <span>Also add to Saved Addresses</span>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveMapLocation}
                    disabled={savingLocation}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <FaCheck size={12} />
                    <span>{savingLocation ? "Saving Location..." : "Save My Location"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Saved Addresses (for Customers) */}
        {activeTab === "addresses" && userData?.role === "user" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddAddress}
              className="md:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 h-fit"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaPlus className="text-[#FF4D2D]" />
                <span>Add New Address</span>
              </h2>
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map((lbl) => (
                  <button
                    type="button"
                    key={lbl}
                    onClick={() => setAddrLabel(lbl)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      addrLabel === lbl
                        ? "bg-[#FF4D2D] text-white border-[#FF4D2D]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={addrText}
                onChange={(e) => setAddrText(e.target.value)}
                placeholder="Complete street address, house/flat no..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
              <input
                type="text"
                value={addrLandmark}
                onChange={(e) => setAddrLandmark(e.target.value)}
                placeholder="Landmark (optional)"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#FF4D2D]"
              />

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Map Pin:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("map")}
                    className="text-[#FF4D2D] font-bold hover:underline"
                  >
                    Pick on Map →
                  </button>
                </div>
                <p className="truncate font-mono text-[11px] text-slate-500">
                  {mapLat.toFixed(4)}, {mapLon.toFixed(4)}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-bold cursor-pointer transition"
              >
                Save Address
              </button>
            </form>

            <div className="md:col-span-7 space-y-3">
              {userData?.savedAddresses?.length === 0 ? (
                <EmptyState
                  icon={<FaMapMarkerAlt />}
                  title="No saved addresses"
                  subtitle="Save your home or office address for faster one-tap checkout."
                />
              ) : (
                userData?.savedAddresses?.map((addr) => (
                  <div
                    key={addr._id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{addr.text}</p>
                      {addr.landmark && (
                        <p className="text-xs text-slate-400 mt-0.5">Near {addr.landmark}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr._id)}
                          className="text-xs font-semibold text-[#FF4D2D] hover:underline cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Favorites (for Customers) */}
        {activeTab === "favorites" && userData?.role === "user" && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Favorite Restaurants</h2>
              {!userData?.favorites?.length ? (
                <EmptyState
                  icon={<FaHeart />}
                  title="No favorite restaurants yet"
                  subtitle="Tap the heart icon on any restaurant to save it here."
                  actionLabel="Explore Restaurants"
                  onAction={() => navigate("/")}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userData.favorites.map((shop) => (
                    <div
                      key={shop._id}
                      onClick={() => navigate(`/shop/${shop._id}`)}
                      className="bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center gap-3 cursor-pointer hover:border-[#FF4D2D] transition"
                    >
                      <img
                        src={resolveImageUrl(shop.image)}
                        alt={shop.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{shop.name}</p>
                        <p className="text-xs text-slate-500">{shop.city}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 5: Security */}
        {activeTab === "security" && (
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 max-w-md"
          >
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-bold cursor-pointer transition"
            >
              Update Password
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ProfilePage;
