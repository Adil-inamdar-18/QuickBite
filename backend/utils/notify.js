import Notification from "../model/notification.model.js";

export const createAndEmitNotification = async (io, { userId, title, message, type = "order", orderId = null }) => {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      orderId,
    });
    if (io) {
      io.to(`user:${String(userId)}`).emit("notification", notification);
    }
    return notification;
  } catch (err) {
    console.error("Notification error:", err.message);
    return null;
  }
};
