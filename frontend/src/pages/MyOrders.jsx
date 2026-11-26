import React, { useEffect, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { TbReceiptRupeeFilled } from "react-icons/tb";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Nav from "../component/Nav";
import Footer from "../component/Footer";
import OwnerOrderCard from "../component/OwnerOrderCard";
import UserOrderCard from "../component/UserOrderCard";
import EmptyState from "../component/EmptyState";
import { api } from "../api/client";
import { addMyOrder, setMyOrders, updateRealTimeOrderStatus } from "../redux/userslice";

function MyOrders() {
  const { userData, myOrders, socket } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [myReviewsMap, setMyReviewsMap] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const refreshOrders = async () => {
      try {
        const res = await api.get("/api/order/my-orders");
        dispatch(setMyOrders(res.data?.orders || []));
      } catch {
        // ignore
      }
    };
    if (userData) refreshOrders();

    if (userData?.role === "user") {
      api
        .get("/api/item/my-reviews")
        .then((res) => {
          const map = {};
          (res.data?.reviews || []).forEach((r) => {
            map[r.item] = r.rating;
          });
          setMyReviewsMap(map);
        })
        .catch(() => {});
    }
  }, [userData?._id, userData?.role, dispatch]);

  useEffect(() => {
    if (!socket || !userData?._id) return;

    const handleNewOrder = (data) => {
      const ownerId = data.shopOrders?.owner?._id || data.shopOrders?.owner;
      if (String(ownerId) === String(userData._id)) {
        dispatch(addMyOrder(data));
      }
    };

    const handleStatusUpdate = ({ orderId, shopId, status, userId }) => {
      if (String(userId) === String(userData._id)) {
        dispatch(updateRealTimeOrderStatus({ orderId, shopId, status }));
      }
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("update-status", handleStatusUpdate);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("update-status", handleStatusUpdate);
    };
  }, [socket, userData?._id, dispatch]);

  const filteredOrders = myOrders.filter((order) => {
    if (statusFilter === "all") return true;
    if (userData?.role === "owner") {
      return order.shopOrders?.status === statusFilter;
    }
    return order.shopOrders?.some((so) => so.status === statusFilter);
  });

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#FF4D2D] cursor-pointer"
            >
              <IoIosArrowRoundBack size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {userData?.role === "owner" ? "Restaurant Orders" : "My Orders"}
              </h1>
              <p className="text-xs text-slate-500">
                {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-[#FF4D2D]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out of delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<TbReceiptRupeeFilled />}
            title="No orders found"
            subtitle={
              userData?.role === "owner"
                ? "Incoming orders from customers will appear here in real time."
                : "You haven't placed any orders yet. Explore delicious restaurants nearby!"
            }
            actionLabel={userData?.role === "user" ? "Browse Restaurants" : undefined}
            onAction={userData?.role === "user" ? () => navigate("/") : undefined}
          />
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) =>
              userData?.role === "user" ? (
                <UserOrderCard
                  key={order._id}
                  data={order}
                  myReviewsMap={myReviewsMap}
                  onRated={(itemId, stars) =>
                    setMyReviewsMap((prev) => ({ ...prev, [itemId]: stars }))
                  }
                  onCancelled={(updated) => {
                    dispatch(
                      setMyOrders(
                        myOrders.map((o) => (o._id === updated._id ? { ...o, ...updated } : o)),
                      ),
                    );
                  }}
                />
              ) : userData?.role === "owner" ? (
                <OwnerOrderCard key={order._id} data={order} />
              ) : null,
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default MyOrders;
