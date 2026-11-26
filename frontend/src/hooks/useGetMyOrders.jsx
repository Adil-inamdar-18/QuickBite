import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api/client";
import { setMyOrders } from "../redux/userslice";

function useGetMyOrders() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData || !["user", "owner"].includes(userData.role)) {
      dispatch(setMyOrders([]));
      return;
    }

    let active = true;
    const fetchOrders = async () => {
      try {
        const result = await api.get("/api/order/my-orders");
        if (active) {
          dispatch(setMyOrders(result.data?.orders || []));
        }
      } catch (err) {
        console.warn("Failed to load orders:", err?.message);
      }
    };

    fetchOrders();
    return () => {
      active = false;
    };
  }, [userData?._id, userData?.role, dispatch]);
}

export default useGetMyOrders;
