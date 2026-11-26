import React from "react";
import { useSelector } from "react-redux";
import UserDashboard from "../component/UserDashboard";
import OwnerDashboard from "../component/OwnerDashboard";
import DeliveryBoy from "../component/DeliveryBoy";
import AdminDashboard from "../component/AdminDashboard";

function Home() {
  const { userData } = useSelector((state) => state.user);

  if (!userData || userData.role === "user") {
    return <UserDashboard />;
  }
  if (userData.role === "owner") {
    return <OwnerDashboard />;
  }
  if (userData.role === "deliveryBoy") {
    return <DeliveryBoy />;
  }
  if (userData.role === "admin") {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}

export default Home;
