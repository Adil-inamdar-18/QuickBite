import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentAddress,
  setCurrentCity,
  setCurrentState,
} from "../redux/userslice";
import { setAddress, setLocation } from "../redux/mapSlice";

function useGetCity() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const apiKey = import.meta.env.VITE_GIOAPIKEY;

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        dispatch(setLocation({ lat: latitude, lon: longitude }));

        if (!apiKey) return;
        try {
          const result = await axios.get(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`,
          );
          const first = result?.data?.results?.[0];
          if (first) {
            const resolvedCity = first.city || first.county || first.state_district;
            if (resolvedCity) dispatch(setCurrentCity(resolvedCity));
            if (first.state) dispatch(setCurrentState(first.state));
            const resolvedAddr = first.address_line2 || first.address_line1 || first.formatted || "";
            if (resolvedAddr) {
              dispatch(setCurrentAddress(resolvedAddr));
              dispatch(setAddress(resolvedAddr));
            }
          }
        } catch (err) {
          console.warn("Reverse geocoding skipped:", err.message);
        }
      },
      () => {
        // Keep default city if geolocation permission denied
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, [userData?._id, apiKey, dispatch]);
}

export default useGetCity;
