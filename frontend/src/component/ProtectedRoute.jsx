import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { PageLoader } from "./Skeletons";

function ProtectedRoute({ children, allowedRoles }) {
  const { userData, authChecked } = useSelector((state) => state.user);

  if (!authChecked) {
    return <PageLoader />;
  }

  if (!userData) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
