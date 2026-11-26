import Shop from "../model/shop.model.js";
import Order from "../model/order.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

export const createEditShop = asyncHandler(async (req, res) => {
  const {
    name,
    city,
    state,
    address,
    description = "",
    cuisines,
    phone = "",
    openingTime = "09:00",
    closingTime = "23:00",
    isOpen,
    deliveryTime = "25-35 mins",
    minOrderAmount = 0,
    latitude,
    longitude,
  } = req.body;

  if (!name?.trim() || !city?.trim() || !state?.trim() || !address?.trim()) {
    throw new ApiError(400, "Name, city, state, and address are required");
  }

  let uploadedImage = null;
  if (req.file) {
    uploadedImage = await uploadOnCloudinary(req.file.path);
  }

  let parsedCuisines = [];
  if (Array.isArray(cuisines)) {
    parsedCuisines = cuisines.map((c) => c.trim()).filter(Boolean);
  } else if (typeof cuisines === "string" && cuisines.trim()) {
    parsedCuisines = cuisines.split(",").map((c) => c.trim()).filter(Boolean);
  }

  let shop = await Shop.findOne({ owner: req.userId });
  const locationUpdate =
    latitude !== undefined && longitude !== undefined && !Number.isNaN(Number(latitude)) && !Number.isNaN(Number(longitude))
      ? {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        }
      : undefined;

  if (!shop) {
    if (!uploadedImage) {
      throw new ApiError(400, "Restaurant image is required");
    }
    shop = await Shop.create({
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      address: address.trim(),
      description: description.trim(),
      cuisines: parsedCuisines,
      phone: phone.trim(),
      openingTime,
      closingTime,
      isOpen: isOpen !== undefined ? isOpen === true || isOpen === "true" : true,
      deliveryTime,
      minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
      image: uploadedImage,
      owner: req.userId,
      ...(locationUpdate ? { location: locationUpdate } : {}),
    });
  } else {
    shop.name = name.trim();
    shop.city = city.trim();
    shop.state = state.trim();
    shop.address = address.trim();
    shop.description = description.trim();
    if (cuisines !== undefined) shop.cuisines = parsedCuisines;
    if (phone !== undefined) shop.phone = phone.trim();
    if (openingTime) shop.openingTime = openingTime;
    if (closingTime) shop.closingTime = closingTime;
    if (isOpen !== undefined) shop.isOpen = isOpen === true || isOpen === "true";
    if (deliveryTime) shop.deliveryTime = deliveryTime;
    if (minOrderAmount !== undefined) shop.minOrderAmount = Math.max(0, Number(minOrderAmount) || 0);
    if (uploadedImage) shop.image = uploadedImage;
    if (locationUpdate) shop.location = locationUpdate;
    await shop.save();
  }

  await shop.populate("owner", "fullName email mobile");
  await shop.populate({
    path: "items",
    options: { sort: { updatedAt: -1 } },
  });

  return res.status(200).json({
    success: true,
    shop,
  });
});

export const getMyShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ owner: req.userId })
    .populate("owner", "fullName email mobile")
    .populate({
      path: "items",
      options: { sort: { updatedAt: -1 } },
    });

  return res.status(200).json({
    success: true,
    shop: shop || null,
  });
});

export const toggleShopStatus = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) {
    throw new ApiError(404, "Restaurant not found");
  }
  shop.isOpen = typeof req.body.isOpen === "boolean" ? req.body.isOpen : !shop.isOpen;
  await shop.save();
  await shop.populate("owner", "fullName email mobile");
  await shop.populate({ path: "items", options: { sort: { updatedAt: -1 } } });

  return res.status(200).json({
    success: true,
    shop,
    message: shop.isOpen ? "Restaurant is now accepting orders" : "Restaurant marked as closed",
  });
});

export const getShopByCity = asyncHandler(async (req, res) => {
  const { city } = req.params;
  const { search = "", openOnly, minRating, sortBy = "popular" } = req.query;

  const filter = {
    isSuspended: { $ne: true },
    approvalStatus: { $nin: ["rejected", "suspended"] },
  };

  if (city && city !== "all" && city !== "null" && city !== "undefined") {
    filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
  }
  if (openOnly === "true") {
    filter.isOpen = true;
  }
  if (minRating) {
    filter["rating.average"] = { $gte: Number(minRating) };
  }
  if (search?.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { cuisines: { $regex: search.trim(), $options: "i" } },
      { address: { $regex: search.trim(), $options: "i" } },
    ];
  }

  let sortOption = { "rating.average": -1, createdAt: -1 };
  if (sortBy === "newest") sortOption = { createdAt: -1 };
  if (sortBy === "name") sortOption = { name: 1 };

  const shops = await Shop.find(filter)
    .sort(sortOption)
    .populate({
      path: "items",
      match: { isAvailable: { $ne: false } },
    });

  return res.status(200).json({
    success: true,
    shops,
  });
});

export const getOwnerAnalytics = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) {
    return res.status(200).json({
      success: true,
      analytics: {
        totalRevenue: 0,
        todayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        dailySales: [],
        bestSellingItems: [],
      },
    });
  }

  const orders = await Order.find({ "shopOrders.owner": req.userId }).lean();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let totalOrders = 0;
  let pendingOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;

  const dailyMap = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: 0,
      orders: 0,
    });
  }

  const itemSalesMap = new Map();

  for (const order of orders) {
    const shopOrder = order.shopOrders.find(
      (so) => String(so.owner) === String(req.userId),
    );
    if (!shopOrder) continue;

    totalOrders += 1;
    if (["pending", "confirmed", "preparing", "ready", "out of delivery"].includes(shopOrder.status)) {
      pendingOrders += 1;
    } else if (shopOrder.status === "delivered") {
      deliveredOrders += 1;
    } else if (["cancelled", "rejected"].includes(shopOrder.status)) {
      cancelledOrders += 1;
    }

    const isRevenueCountable =
      !["cancelled", "rejected"].includes(shopOrder.status) &&
      (order.paymentMethod === "cod" || order.paymentStatus === "paid" || order.payment);

    if (isRevenueCountable) {
      const amount = Number(shopOrder.subtotal || 0);
      const created = new Date(order.createdAt);
      totalRevenue += amount;
      if (created >= startOfToday) todayRevenue += amount;
      if (created >= startOfWeek) weeklyRevenue += amount;
      if (created >= startOfMonth) monthlyRevenue += amount;

      const dayKey = created.toISOString().slice(0, 10);
      if (dailyMap.has(dayKey)) {
        const entry = dailyMap.get(dayKey);
        entry.revenue += amount;
        entry.orders += 1;
      }

      for (const item of shopOrder.shopOrderItems || []) {
        const id = String(item.item);
        const current = itemSalesMap.get(id) || {
          itemId: id,
          name: item.name,
          quantitySold: 0,
          revenue: 0,
        };
        current.quantitySold += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        itemSalesMap.set(id, current);
      }
    }
  }

  const bestSellingItems = Array.from(itemSalesMap.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 6);

  return res.status(200).json({
    success: true,
    analytics: {
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      dailySales: Array.from(dailyMap.values()),
      bestSellingItems,
    },
  });
});
