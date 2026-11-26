import jwt from "jsonwebtoken";
import User from "./model/user.model.js";
import Order from "./model/order.model.js";
import DeliveryAssignment from "./model/deliveryAssignment.model.js";

const parseCookies = (cookieHeader = "") => {
  const cookies = {};
  cookieHeader.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      cookies[key] = val;
    }
  });
  return cookies;
};

export const socketHandler = (io) => {
  // Authenticate every socket connection via verified JWT cookie or handshake token
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie || "");
      const token = cookies.token || socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.userId).select("_id role isBlocked");

      if (!user || user.isBlocked) {
        return next(new Error("Unauthorized user"));
      }

      socket.userId = String(user._id);
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    // Join personal room for notifications & targeted order events
    socket.join(`user:${userId}`);

    try {
      await User.findByIdAndUpdate(userId, {
        socketId: socket.id,
        ...(socket.userRole !== "deliveryBoy" ? { isOnline: true } : {}),
      });
    } catch (error) {
      console.error("Socket connect user update error:", error.message);
    }

    // Authorize room subscription for live order tracking
    socket.on("joinOrderRoom", async ({ orderId }) => {
      try {
        if (!orderId) return;
        const order = await Order.findById(orderId).select("user shopOrders");
        if (!order) return;

        const isCustomer = String(order.user) === userId;
        const isOwner = order.shopOrders.some((so) => String(so.owner) === userId);
        const isDelivery = order.shopOrders.some(
          (so) => so.assignedDeliveryBoy && String(so.assignedDeliveryBoy) === userId,
        );
        const isAdmin = socket.userRole === "admin";

        if (isCustomer || isOwner || isDelivery || isAdmin) {
          socket.join(`order:${String(order._id)}`);
        }
      } catch (error) {
        console.error("joinOrderRoom error:", error.message);
      }
    });

    // Only authenticated delivery partners can update their own coordinates, emitted only to authorized order room
    socket.on("updateLocation", async ({ latitude, longitude }) => {
      try {
        if (socket.userRole !== "deliveryBoy") return;
        const lat = Number(latitude);
        const lon = Number(longitude);
        if (
          Number.isNaN(lat) ||
          Number.isNaN(lon) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          return;
        }

        await User.findByIdAndUpdate(userId, {
          location: {
            type: "Point",
            coordinates: [lon, lat],
          },
          socketId: socket.id,
        });

        const activeAssignment = await DeliveryAssignment.findOne({
          assignedTo: userId,
          status: { $in: ["assigned", "picked_up"] },
        }).select("order");

        if (activeAssignment?.order) {
          io.to(`order:${String(activeAssignment.order)}`).emit("updateDeliveryLocation", {
            deliveryBoyId: userId,
            latitude: lat,
            longitude: lon,
          });
        }
      } catch (error) {
        console.error("updateLocation error:", error.message);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await User.findOneAndUpdate(
          { _id: userId, socketId: socket.id },
          { socketId: null },
        );
      } catch (error) {
        console.error("Socket disconnect error:", error.message);
      }
    });
  });
};
