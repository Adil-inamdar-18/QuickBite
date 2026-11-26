import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { api } from "../api/client";
import { setAuthChecked, setNotifications, setUserData } from "../redux/userslice";

function useGetCurrentUser() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      try {
        const result = await api.get("/api/user/current");
        if (active && result.data?.user) {
          dispatch(setUserData(result.data.user));
          try {
            const notifRes = await api.get("/api/user/notifications");
            if (active && notifRes.data?.success) {
              dispatch(setNotifications(notifRes.data));
            }
          } catch {
            // ignore notification fetch failure
          }
        }
      } catch {
        if (active) dispatch(setUserData(null));
      } finally {
        if (active) {
          dispatch(setAuthChecked(true));
          setLoading(false);
        }
      }
    };

    fetchUser();
    return () => {
      active = false;
    };
  }, [dispatch]);

  return { loading };
}

export default useGetCurrentUser;
