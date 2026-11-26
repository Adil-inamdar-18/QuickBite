import { useEffect } from "react";
import { useSelector } from "react-redux";
import { api } from "../api/client";

function useUpdateLocation() {
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData || userData.role !== "deliveryBoy" || !navigator.geolocation) {
      return;
    }

    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSent < 10000) return;
        lastSent = now;
        try {
          await api.post("/api/user/update-location", {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        } catch {
          // ignore transient geo errors
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userData?._id, userData?.role]);
}

export default useUpdateLocation;
