import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";

import { SERVER_URL } from "./api/client";
import { addNotification, setSocket } from "./redux/userslice";
import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCity from "./hooks/useGetCity";
import useGetMyShop from "./hooks/useGetMyShop";
import useGetShopByCity from "./hooks/useGetShopByCity";
import useGetItemByCity from "./hooks/useGetItemByCity";
import useGetMyOrders from "./hooks/useGetMyOrders";
import useUpdateLocation from "./hooks/useUpdateLocation";

import ErrorBoundary from "./component/ErrorBoundary";
import ProtectedRoute from "./component/ProtectedRoute";
import { PageLoader } from "./component/Skeletons";

import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import CreateEditShop from "./pages/CreateEditShop";
import AddItem from "./pages/AddItem";
import EditItem from "./pages/EditItem";
import CartPage from "./pages/CartPage";
import CheckOut from "./pages/CheckOut";
import OrderPlaced from "./pages/OrderPlaced";
import MyOrders from "./pages/MyOrders";
import TrackOrderPage from "./pages/TrackOrderPage";
import Shop from "./pages/Shop";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";

function AppRoutes() {
  const dispatch = useDispatch();
  useGetCurrentUser();
  useGetCity();
  useGetShopByCity();
  useGetItemByCity();
  useGetMyShop();
  useGetMyOrders();
  useUpdateLocation();

  const { userData, authChecked } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData?._id) {
      dispatch(setSocket(null));
      return;
    }

    const socketInstance = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    dispatch(setSocket(socketInstance));

    socketInstance.on("notification", (notif) => {
      if (notif) {
        dispatch(addNotification(notif));
        toast(notif.message, { icon: "🔔" });
      }
    });

    return () => {
      socketInstance.off("notification");
      socketInstance.disconnect();
      dispatch(setSocket(null));
    };
  }, [userData?._id, dispatch]);

  if (!authChecked) {
    return <PageLoader />;
  }

  return (
    <Routes>
      <Route
        path="/signup"
        element={!userData ? <SignUp /> : <Navigate to="/" replace />}
      />
      <Route
        path="/signin"
        element={!userData ? <SignIn /> : <Navigate to="/" replace />}
      />
      <Route
        path="/forgot-password"
        element={!userData ? <ForgotPassword /> : <Navigate to="/" replace />}
      />
      <Route
        path="/fortgot-password"
        element={<Navigate to="/forgot-password" replace />}
      />

      {/* Home renders customer discovery for guests & customers, or role dashboards */}
      <Route path="/" element={<Home />} />
      <Route path="/shop/:shopId" element={<Shop />} />
      <Route path="/cart" element={<CartPage />} />

      {/* Customer Protected Routes */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <CheckOut />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order-placed"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <OrderPlaced />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-orders"
        element={
          <ProtectedRoute allowedRoles={["user", "owner"]}>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/track-order/:orderId"
        element={
          <ProtectedRoute allowedRoles={["user", "owner", "deliveryBoy", "admin"]}>
            <TrackOrderPage />
          </ProtectedRoute>
        }
      />

      {/* Owner Protected Routes */}
      <Route
        path="/create-edit-shop"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <CreateEditShop />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-item"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <AddItem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-item/:itemId"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <EditItem />
          </ProtectedRoute>
        }
      />

      {/* Shared Authenticated Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: "12px", fontSize: "14px" },
        }}
      />
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
