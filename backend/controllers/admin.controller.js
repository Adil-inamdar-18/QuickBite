import User from "../model/user.model.js";
import Shop from "../model/shop.model.js";
import Order from "../model/order.model.js";
import Category from "../model/category.model.js";
import Coupon from "../model/coupon.model.js";
import SupportTicket from "../model/supportTicket.model.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

export const getAdminOverview = asyncHandler(async (req, res) => {
  const [
    totalCustomers,
    totalOwners,
    totalDeliveryBoys,
    totalRestaurants,
    pendingRestaurants,
    totalOrders,
    openTickets,
    orders,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    User.countDocuments({ role: "deliveryBoy" }),
    Shop.countDocuments(),
    Shop.countDocuments({ approvalStatus: "pending" }),
    Order.countDocuments(),
    SupportTicket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    Order.find({
      $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }, { payment: true }],
    })
      .select("totalAmount createdAt shopOrders paymentStatus")
      .lean(),
  ]);

  let totalRevenue = 0;
  const dailyMap = new Map();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: 0,
      orders: 0,
    });
  }

  for (const order of orders) {
    const allCancelled = order.shopOrders?.every((so) =>
      ["cancelled", "rejected"].includes(so.status),
    );
    if (allCancelled) continue;
    totalRevenue += Number(order.totalAmount || 0);
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key);
      entry.revenue += Number(order.totalAmount || 0);
      entry.orders += 1;
    }
  }

  return res.status(200).json({
    success: true,
    overview: {
      totalCustomers,
      totalOwners,
      totalDeliveryBoys,
      totalRestaurants,
      pendingRestaurants,
      totalOrders,
      openTickets,
      totalRevenue,
      dailyRevenue: Array.from(dailyMap.values()),
    },
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search = "" } = req.query;
  const filter = {};
  if (role && role !== "all") filter.role = role;
  if (search.trim()) {
    filter.$or = [
      { fullName: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
    ];
  }
  const users = await User.find(filter)
    .select("-password -resetOtpHash")
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, users });
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (String(userId) === String(req.userId)) {
    throw new ApiError(400, "You cannot block your own admin account");
  }
  const user = await User.findById(userId).select("-password -resetOtpHash");
  if (!user) throw new ApiError(404, "User not found");

  user.isBlocked = !user.isBlocked;
  await user.save();

  return res.status(200).json({
    success: true,
    user,
    message: user.isBlocked ? "User suspended" : "User activated",
  });
});

export const getAllShopsAdmin = asyncHandler(async (req, res) => {
  const shops = await Shop.find()
    .populate("owner", "fullName email mobile")
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, shops });
});

export const updateShopStatusAdmin = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { approvalStatus, isSuspended } = req.body;

  const shop = await Shop.findById(shopId).populate("owner", "fullName email mobile");
  if (!shop) throw new ApiError(404, "Restaurant not found");

  if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
    shop.approvalStatus = approvalStatus;
  }
  if (typeof isSuspended === "boolean") {
    shop.isSuspended = isSuspended;
  }
  await shop.save();

  return res.status(200).json({ success: true, shop, message: "Restaurant status updated" });
});

export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "fullName email mobile")
    .populate("shopOrders.shop", "name city")
    .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");
  return res.status(200).json({ success: true, orders });
});

export const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  return res.status(200).json({ success: true, categories });
});

export const createCategoryAdmin = asyncHandler(async (req, res) => {
  const { name, image = "", sortOrder = 0 } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Category name is required");
  const category = await Category.create({
    name: name.trim(),
    image: image.trim(),
    sortOrder: Number(sortOrder) || 0,
  });
  return res.status(201).json({ success: true, category });
});

export const toggleCategoryAdmin = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, "Category not found");
  category.isActive = !category.isActive;
  await category.save();
  return res.status(200).json({ success: true, category });
});

export const deleteCategoryAdmin = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const deleted = await Category.findByIdAndDelete(categoryId);
  if (!deleted) throw new ApiError(404, "Category not found");
  return res.status(200).json({ success: true, message: "Category deleted" });
});

export const getAllCouponsAdmin = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return res.status(200).json({ success: true, coupons });
});

export const createCouponAdmin = asyncHandler(async (req, res) => {
  const {
    code,
    description = "",
    discountType,
    discountValue,
    minOrderAmount = 0,
    maxDiscount = null,
    expiresAt,
    usageLimit = null,
  } = req.body;

  if (!code?.trim() || !discountType || !discountValue || !expiresAt) {
    throw new ApiError(400, "Code, discount type, value, and expiry date are required");
  }

  const coupon = await Coupon.create({
    code: code.trim().toUpperCase(),
    description: description.trim(),
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
    maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    expiresAt: new Date(expiresAt),
    usageLimit: usageLimit ? Number(usageLimit) : null,
  });

  return res.status(201).json({ success: true, coupon });
});

export const toggleCouponAdmin = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return res.status(200).json({ success: true, coupon });
});

export const deleteCouponAdmin = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const deleted = await Coupon.findByIdAndDelete(couponId);
  if (!deleted) throw new ApiError(404, "Coupon not found");
  return res.status(200).json({ success: true, message: "Coupon deleted" });
});

export const getAllSupportTicketsAdmin = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find()
    .sort({ createdAt: -1 })
    .populate("user", "fullName email role mobile")
    .populate("order", "orderNumber totalAmount");
  return res.status(200).json({ success: true, tickets });
});

export const updateSupportTicketAdmin = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { status, adminReply } = req.body;

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw new ApiError(404, "Support ticket not found");

  if (status && ["open", "in_progress", "resolved", "closed"].includes(status)) {
    ticket.status = status;
    if (status === "resolved") ticket.resolvedAt = new Date();
  }
  if (adminReply !== undefined) {
    ticket.adminReply = adminReply.trim();
  }

  await ticket.save();
  return res.status(200).json({ success: true, ticket });
});
