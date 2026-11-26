import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api/client";
import { setItemsInMyCity } from "../redux/userslice";

function useGetItemByCity() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { currentCity } = useSelector((state) => state.user);

  useEffect(() => {
    let active = true;
    const cityParam = currentCity?.trim() || "all";

    const fetchItems = async () => {
      setLoading(true);
      try {
        const result = await api.get(`/api/item/get-by-city/${encodeURIComponent(cityParam)}`);
        if (active) {
          dispatch(setItemsInMyCity(result.data?.items || []));
        }
      } catch (err) {
        console.warn("Failed to load items:", err?.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchItems();
    return () => {
      active = false;
    };
  }, [currentCity, dispatch]);

  return { loading };
}

export default useGetItemByCity;
