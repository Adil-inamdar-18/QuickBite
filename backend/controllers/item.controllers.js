import Item from "../model/item.model.js";
import Shop from "../model/shop.model.js";
import Order from "../model/order.model.js";
import Review from "../model/review.model.js";
import Category from "../model/category.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

const DEFAULT_CATEGORIES = [
  "Pizza",
  "Burger",
  "Biryani",
  "Chinese",
  "South Indian",
  "North Indian",
  "Fast Food",
  "Desserts",
  "Ice Cream",
  "Beverages",
  "Bakery",
  "Sandwich",
  "Rolls",
  "Pasta",
  "Momos",
  "Street Food",
  "Healthy Food",
  "Seafood",
  "Vegetarian",
  "Non Vegetarian",
];

export const addItem = asyncHandler(async (req, res) => {
  const { name, category, foodType, price, description = "", preparationTime = 15, isAvailable = true } = req.body;

  if (!name?.trim() || !category?.trim() || !foodType || price === undefined) {
    throw new ApiError(400, "Name, category, food type, and price are required");
  }
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new ApiError(400, "Price must be a valid non-negative number");
  }

  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) {
    throw new ApiError(404, "Please register your restaurant before adding food items");
  }

  if (!req.file) {
    throw new ApiError(400, "Food item image is required");
  }
  const image = await uploadOnCloudinary(req.file.path);

  const item = await Item.create({
    name: name.trim(),
    description: description.trim(),
    category: category.trim(),
    foodType,
    price: numericPrice,
    preparationTime: Math.max(1, Number(preparationTime) || 15),
    isAvailable: isAvailable === true || isAvailable === "true",
    image,
    shop: shop._id,
  });

  shop.items.push(item._id);
  await shop.save();
  await shop.populate("owner", "fullName email mobile");
  await shop.populate({
    path: "items",
    options: { sort: { updatedAt: -1 } },
  });

  return res.status(201).json({
    success: true,
    shop,
    item,
  });
});

export const editItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { name, category, foodType, price, description, preparationTime, isAvailable } = req.body;

  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) {
    throw new ApiError(404, "Restaurant not found");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Food item not found");
  }

  if (String(item.shop) !== String(shop._id)) {
    throw new ApiError(403, "Forbidden: You can only edit items belonging to your restaurant");
  }

  if (name?.trim()) item.name = name.trim();
  if (description !== undefined) item.description = description.trim();
  if (category?.trim()) item.category = category.trim();
  if (foodType) item.foodType = foodType;
  if (price !== undefined) {
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      throw new ApiError(400, "Price must be a valid non-negative number");
    }
    item.price = numericPrice;
  }
  if (preparationTime !== undefined) {
    item.preparationTime = Math.max(1, Number(preparationTime) || 15);
  }
  if (isAvailable !== undefined) {
    item.isAvailable = isAvailable === true || isAvailable === "true";
  }
  if (req.file) {
    item.image = await uploadOnCloudinary(req.file.path);
  }

  await item.save();
  await shop.populate("owner", "fullName email mobile");
  await shop.populate({
    path: "items",
    options: { sort: { updatedAt: -1 } },
  });

  return res.status(200).json({
    success: true,
    shop,
    item,
  });
});

export const toggleItemAvailability = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) throw new ApiError(404, "Restaurant not found");

  const item = await Item.findById(itemId);
  if (!item) throw new ApiError(404, "Food item not found");
  if (String(item.shop) !== String(shop._id)) {
    throw new ApiError(403, "Forbidden: You do not own this food item");
  }

  item.isAvailable = !item.isAvailable;
  await item.save();

  await shop.populate("owner", "fullName email mobile");
  await shop.populate({ path: "items", options: { sort: { updatedAt: -1 } } });

  return res.status(200).json({
    success: true,
    shop,
    item,
  });
});

export const getItemById = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await Item.findById(itemId).populate("shop", "name image city isOpen");
  if (!item) {
    throw new ApiError(404, "Food item not found");
  }
  return res.status(200).json({ success: true, item });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const shop = await Shop.findOne({ owner: req.userId });
  if (!shop) {
    throw new ApiError(404, "Restaurant not found");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Food item not found");
  }

  if (String(item.shop) !== String(shop._id)) {
    throw new ApiError(403, "Forbidden: You can only delete items from your own restaurant");
  }

  await Item.findByIdAndDelete(itemId);
  shop.items = shop.items.filter((id) => String(id) !== String(item._id));
  await shop.save();

  await shop.populate("owner", "fullName email mobile");
  await shop.populate({
    path: "items",
    options: { sort: { updatedAt: -1 } },
  });

  return res.status(200).json({
    success: true,
    shop,
    message: "Food item deleted",
  });
});

const buildShopFilter = (city) => {
  const filter = {
    isSuspended: { $ne: true },
    approvalStatus: { $nin: ["rejected", "suspended"] },
  };
  if (city && city !== "all" && city !== "null" && city !== "undefined") {
    filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
  }
  return filter;
};

export const getItemByCity = asyncHandler(async (req, res) => {
  const { city } = req.params;
  const { category, foodType, minPrice, maxPrice, minRating, sortBy, availableOnly } = req.query;

  const shops = await Shop.find(buildShopFilter(city)).select("_id");
  const shopIds = shops.map((s) => s._id);

  const itemFilter = { shop: { $in: shopIds } };
  if (category && category !== "All") {
    itemFilter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
  }
  if (foodType && ["veg", "non veg"].includes(foodType)) {
    itemFilter.foodType = foodType;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    itemFilter.price = {};
    if (minPrice !== undefined && minPrice !== "") itemFilter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") itemFilter.price.$lte = Number(maxPrice);
  }
  if (minRating) {
    itemFilter["rating.average"] = { $gte: Number(minRating) };
  }
  if (availableOnly === "true") {
    itemFilter.isAvailable = true;
  }

  let sortOption = { createdAt: -1 };
  if (sortBy === "price_asc") sortOption = { price: 1 };
  if (sortBy === "price_desc") sortOption = { price: -1 };
  if (sortBy === "rating") sortOption = { "rating.average": -1 };

  const items = await Item.find(itemFilter)
    .sort(sortOption)
    .populate("shop", "name image city isOpen openingTime closingTime deliveryTime");

  return res.status(200).json({
    success: true,
    items,
  });
});

export const getItemsByShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const shop = await Shop.findById(shopId).populate({
    path: "items",
    options: { sort: { updatedAt: -1 } },
  });

  if (!shop || shop.isSuspended || shop.approvalStatus === "rejected") {
    throw new ApiError(404, "Restaurant not found");
  }

  const reviews = await Review.find({ shop: shop._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("user", "fullName")
    .populate("item", "name");

  return res.status(200).json({
    success: true,
    shop,
    items: shop.items,
    reviews,
  });
});

export const searchItems = asyncHandler(async (req, res) => {
  const { query = "", city, category, foodType, minPrice, maxPrice, minRating, sortBy } = req.query;

  const shops = await Shop.find(buildShopFilter(city)).select("_id name image city isOpen rating deliveryTime");
  const shopIds = shops.map((s) => s._id);

  const itemFilter = { shop: { $in: shopIds } };
  if (query.trim()) {
    const regex = { $regex: query.trim(), $options: "i" };
    itemFilter.$or = [{ name: regex }, { category: regex }, { description: regex }];
  }
  if (category && category !== "All") {
    itemFilter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
  }
  if (foodType && ["veg", "non veg"].includes(foodType)) {
    itemFilter.foodType = foodType;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    itemFilter.price = {};
    if (minPrice !== undefined && minPrice !== "") itemFilter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") itemFilter.price.$lte = Number(maxPrice);
  }
  if (minRating) {
    itemFilter["rating.average"] = { $gte: Number(minRating) };
  }

  let sortOption = { "rating.average": -1 };
  if (sortBy === "price_asc") sortOption = { price: 1 };
  if (sortBy === "price_desc") sortOption = { price: -1 };
  if (sortBy === "newest") sortOption = { createdAt: -1 };

  const items = await Item.find(itemFilter)
    .sort(sortOption)
    .populate("shop", "name image city isOpen deliveryTime");

  const matchingShops = query.trim()
    ? shops.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  return res.status(200).json({
    success: true,
    items,
    shops: matchingShops,
  });
});

export const rating = asyncHandler(async (req, res) => {
  const { itemId, rating: ratingValue, comment = "" } = req.body;
  const numericRating = Number(ratingValue);

  if (!itemId || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, "Item ID and a rating between 1 and 5 are required");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Food item not found");
  }

  const deliveredOrder = await Order.findOne({
    user: req.userId,
    shopOrders: {
      $elemMatch: {
        status: "delivered",
        "shopOrderItems.item": item._id,
      },
    },
  });

  if (!deliveredOrder) {
    throw new ApiError(403, "You can only rate items from orders that have been delivered to you");
  }

  const existingReview = await Review.findOne({ user: req.userId, item: item._id });
  if (existingReview) {
    throw new ApiError(409, "You have already submitted a rating for this item");
  }

  const review = await Review.create({
    user: req.userId,
    item: item._id,
    shop: item.shop,
    order: deliveredOrder._id,
    rating: numericRating,
    comment: comment.trim(),
  });

  const itemStats = await Review.aggregate([
    { $match: { item: item._id } },
    { $group: { _id: "$item", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (itemStats[0]) {
    item.rating = {
      average: Number(itemStats[0].average.toFixed(1)),
      count: itemStats[0].count,
    };
    await item.save();
  }

  const shopStats = await Review.aggregate([
    { $match: { shop: item.shop } },
    { $group: { _id: "$shop", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (shopStats[0]) {
    await Shop.findByIdAndUpdate(item.shop, {
      rating: {
        average: Number(shopStats[0].average.toFixed(1)),
        count: shopStats[0].count,
      },
    });
  }

  return res.status(201).json({
    success: true,
    rating: item.rating,
    review,
    message: "Thank you for your review",
  });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.userId }).select("item rating comment createdAt");
  return res.status(200).json({ success: true, reviews });
});

export const getPublicCategories = asyncHandler(async (req, res) => {
  try {
    let categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    if (categories.length === 0) {
      await Category.insertMany(
        DEFAULT_CATEGORIES.map((name, idx) => ({ name, sortOrder: idx })),
        { ordered: false },
      ).catch(() => {});
      categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    }
    return res.status(200).json({ success: true, categories });
  } catch {
    // If DB is offline in test or fallback, return default category array
    return res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES.map((name, sortOrder) => ({
        _id: String(sortOrder + 1),
        name,
        isActive: true,
        sortOrder,
      })),
    });
  }
});
