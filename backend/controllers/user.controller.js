import bcrypt from "bcryptjs";
import User from "../model/user.model.js";
import Shop from "../model/shop.model.js";
import Notification from "../model/notification.model.js";
import SupportTicket from "../model/supportTicket.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .select("-password -resetOtpHash")
    .populate("favorites", "name image city rating isOpen deliveryTime")
    .populate("favoriteItems", "name image price foodType rating shop");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({
    success: true,
    user,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, mobile, vehicleType, vehicleNumber } = req.body;
  const user = await User.findById(req.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (fullName?.trim()) {
    user.fullName = fullName.trim();
  }
  if (mobile !== undefined) {
    const cleanMobile = String(mobile).replace(/\D/g, "");
    if (cleanMobile.length < 10 || cleanMobile.length > 15) {
      throw new ApiError(400, "Mobile number must be 10 to 15 digits");
    }
    user.mobile = cleanMobile;
  }
  if (req.file) {
    user.avatar = await uploadOnCloudinary(req.file.path);
  }
  if (user.role === "deliveryBoy" && (vehicleType || vehicleNumber !== undefined)) {
    user.vehicleInfo = {
      type: vehicleType || user.vehicleInfo?.type || "Bike",
      number: vehicleNumber !== undefined ? vehicleNumber.trim() : user.vehicleInfo?.number || "",
    };
  }

  await user.save();
  const safeUser = await User.findById(user._id).select("-password -resetOtpHash");

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: safeUser,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new passwords are required");
  }
  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const user = await User.findById(req.userId).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!user.password) {
    throw new ApiError(400, "Google accounts cannot change password here");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const updateUserLocation = asyncHandler(async (req, res) => {
  const { lat, lon, city, address } = req.body;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new ApiError(400, "Valid latitude and longitude coordinates are required");
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.location = {
    type: "Point",
    coordinates: [longitude, latitude],
  };
  await user.save();

  if (user.role === "owner") {
    await Shop.findOneAndUpdate(
      { owner: user._id },
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        ...(city?.trim() ? { city: city.trim() } : {}),
        ...(address?.trim() ? { address: address.trim() } : {}),
      },
    );
  }

  const sanitizedUser = await User.findById(user._id)
    .select("-password -resetOtpHash")
    .populate("favorites", "name image city rating isOpen deliveryTime")
    .populate("favoriteItems", "name image price foodType rating shop");

  return res.status(200).json({
    success: true,
    message: "Location updated successfully",
    user: sanitizedUser,
  });
});

export const toggleOnlineStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const desired = typeof req.body.isOnline === "boolean" ? req.body.isOnline : !user.isOnline;
  user.isOnline = desired;
  await user.save();

  return res.status(200).json({
    success: true,
    isOnline: user.isOnline,
    message: user.isOnline ? "You are now online" : "You are now offline",
  });
});

export const addSavedAddress = asyncHandler(async (req, res) => {
  const { label = "Home", text, landmark = "", latitude, longitude, isDefault = false } = req.body;
  if (!text?.trim() || latitude === undefined || longitude === undefined) {
    throw new ApiError(400, "Address text and coordinates are required");
  }

  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  if (isDefault || user.savedAddresses.length === 0) {
    user.savedAddresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.savedAddresses.push({
    label: label.trim(),
    text: text.trim(),
    landmark: landmark.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    isDefault: isDefault || user.savedAddresses.length === 0,
  });

  await user.save();
  return res.status(201).json({
    success: true,
    savedAddresses: user.savedAddresses,
  });
});

export const deleteSavedAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  const exists = user.savedAddresses.id(addressId);
  if (!exists) throw new ApiError(404, "Address not found");

  user.savedAddresses.pull({ _id: addressId });
  if (user.savedAddresses.length > 0 && !user.savedAddresses.some((a) => a.isDefault)) {
    user.savedAddresses[0].isDefault = true;
  }

  await user.save();
  return res.status(200).json({
    success: true,
    savedAddresses: user.savedAddresses,
  });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  const target = user.savedAddresses.id(addressId);
  if (!target) throw new ApiError(404, "Address not found");

  user.savedAddresses.forEach((a) => {
    a.isDefault = String(a._id) === String(addressId);
  });

  await user.save();
  return res.status(200).json({
    success: true,
    savedAddresses: user.savedAddresses,
  });
});

export const toggleFavoriteShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  const idx = user.favorites.findIndex((id) => String(id) === String(shopId));
  let isFavorite = false;
  if (idx > -1) {
    user.favorites.splice(idx, 1);
  } else {
    user.favorites.push(shopId);
    isFavorite = true;
  }

  await user.save();
  await user.populate("favorites", "name image city rating isOpen deliveryTime");

  return res.status(200).json({
    success: true,
    isFavorite,
    favorites: user.favorites,
  });
});

export const toggleFavoriteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  const idx = user.favoriteItems.findIndex((id) => String(id) === String(itemId));
  let isFavorite = false;
  if (idx > -1) {
    user.favoriteItems.splice(idx, 1);
  } else {
    user.favoriteItems.push(itemId);
    isFavorite = true;
  }

  await user.save();
  await user.populate("favoriteItems", "name image price foodType rating shop");

  return res.status(200).json({
    success: true,
    isFavorite,
    favoriteItems: user.favoriteItems,
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .limit(40);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.body;
  if (notificationId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.userId },
      { isRead: true },
    );
  } else {
    await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
  }

  return res.status(200).json({ success: true, message: "Notifications updated" });
});

export const createSupportTicket = asyncHandler(async (req, res) => {
  const { subject, category = "order_issue", message, orderId = null } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    throw new ApiError(400, "Subject and message are required");
  }

  const ticket = await SupportTicket.create({
    user: req.userId,
    order: orderId || null,
    subject: subject.trim(),
    category,
    message: message.trim(),
  });

  return res.status(201).json({
    success: true,
    ticket,
    message: "Support request submitted",
  });
});

export const getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate("order", "orderNumber totalAmount createdAt");

  return res.status(200).json({
    success: true,
    tickets,
  });
});
