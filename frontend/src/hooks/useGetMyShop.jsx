import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api/client";
import { setMyShopData } from "../redux/ownerSlice";

function useGetMyShop() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData || userData.role !== "owner") {
      dispatch(setMyShopData(null));
      return;
    }

    let active = true;
    const fetchShop = async () => {
      setLoading(true);
      try {
        const result = await api.get("/api/shop/get-my");
        if (active) {
          dispatch(setMyShopData(result.data?.shop || null));
        }
      } catch (err) {
        console.warn("Failed to load my shop:", err?.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchShop();
    return () => {
      active = false;
    };
  }, [userData?._id, userData?.role, dispatch]);

  return { loading };
}

export default useGetMyShop;
