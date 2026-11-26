import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api/client";
import { setShopInMyCity } from "../redux/userslice";

function useGetShopByCity() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { currentCity } = useSelector((state) => state.user);

  useEffect(() => {
    let active = true;
    const cityParam = currentCity?.trim() || "all";

    const fetchShops = async () => {
      setLoading(true);
      try {
        const result = await api.get(`/api/shop/get-by-city/${encodeURIComponent(cityParam)}`);
        if (active) {
          dispatch(setShopInMyCity(result.data?.shops || []));
        }
      } catch (err) {
        console.warn("Failed to load restaurants:", err?.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchShops();
    return () => {
      active = false;
    };
  }, [currentCity, dispatch]);

  return { loading };
}

export default useGetShopByCity;
