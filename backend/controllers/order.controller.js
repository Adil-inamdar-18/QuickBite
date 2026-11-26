import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../model/order.model.js";
import Shop from "../model/shop.model.js";
import Item from "../model/item.model.js";
import User from "../model/user.model.js";
import Coupon from "../model/coupon.model.js";
import DeliveryAssignment from "../model/deliveryAssignment.model.js";
import { sendDeliveryOtpMail } from "../utils/mail.js";
import {
  calculateDeliveryFee,
  calculateTax,
  validateAndComputeCoupon,
} from "../utils/pricing.js";
import {
  DELIVERY_OTP_EXPIRY_MS,
  generateOtp,
  hashOtp,
  MAX_OTP_ATTEMPTS,
  verifyOtpHash,
} from "../utils/otp.js";
import { createAndEmitNotification } from "../utils/notify.js";
import { ApiError, asyncHandler } from "../middlewares/errorHandler.js";

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const VALID_TRANSITIONS = {
  pending: ["confirmed", "preparing", "rejected", "cancelled"],
  confirmed: ["preparing", "rejected", "cancelled"],
  preparing: ["ready", "out of delivery", "cancelled"],
  ready: ["out of delivery", "cancelled"],
  "out of delivery": ["delivered"],
  delivered: [],
  cancelled: [],
  rejected: [],
};

const emitOrderToOwners = async (io, order) => {
  if (!io || !order) return;
  for (const shopOrder of order.shopOrders) {
    const ownerId = String(shopOrder.owner?._id || shopOrder.owner);
    io.to(`user:${ownerId}`).emit("newOrder", {
      _id: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      user: order.user,
      shopOrders: shopOrder,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      payment: order.payment,
    });

    await createAndEmitNotification(io, {
      userId: ownerId,
      title: "New Order Received",
      message: `Order ${order.orderNumber} worth ₹${shopOrder.subtotal} has been placed.`,
      type: "order",
      orderId: order._id,
    });
  }
};

export const validateCouponCode = asyncHandler(async (req, res) => {
  const { code, itemsSubtotal } = req.body;
  const subtotal = Number(itemsSubtotal || 0);
  if (!code?.trim()) {
    throw new ApiError(400, "Coupon code is required");
  }
  const { coupon, discountAmount } = await validateAndComputeCoupon(code, subtotal);
  return res.status(200).json({
    success: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountAmount,
  });
});

export const placeOrder = asyncHandler(async (req, res) => {
  const { cartItems, paymentMethod, deliveryAddress, couponCode = "" } = req.body;

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }
  if (!["cod", "online"].includes(paymentMethod)) {
    throw new ApiError(400, "Invalid payment method");
  }
  if (
    !deliveryAddress?.text?.trim() ||
    deliveryAddress?.latitude === undefined ||
    deliveryAddress?.longitude === undefined
  ) {
    throw new ApiError(400, "Complete delivery address with map location is required");
  }

  // Fetch authoritative item & shop data from database — never trust client prices
  const itemIds = cartItems.map((ci) => ci.id || ci._id || ci.item);
  const dbItems = await Item.find({ _id: { $in: itemIds } }).populate("shop");
  const itemMap = new Map(dbItems.map((item) => [String(item._id), item]));

  const groupItemsByShop = new Map();
  let itemsSubtotal = 0;

  for (const cartItem of cartItems) {
    const id = String(cartItem.id || cartItem._id || cartItem.item || "");
    const qty = Math.floor(Number(cartItem.quantity));
    if (!id || Number.isNaN(qty) || qty < 1 || qty > 50) {
      throw new ApiError(400, "Invalid item quantity in cart");
    }

    const dbItem = itemMap.get(id);
    if (!dbItem) {
      throw new ApiError(404, `Menu item ${cartItem.name || id} is no longer available`);
    }
    if (dbItem.isAvailable === false) {
      throw new ApiError(400, `${dbItem.name} is currently out of stock`);
    }
    const shop = dbItem.shop;
    if (!shop || shop.isSuspended || shop.approvalStatus !== "approved") {
      throw new ApiError(400, "One of the selected restaurants is unavailable");
    }
    if (!shop.isOpen) {
      throw new ApiError(400, `${shop.name} is currently closed and not accepting orders`);
    }

    const shopId = String(shop._id);
    if (!groupItemsByShop.has(shopId)) {
      groupItemsByShop.set(shopId, { shop, items: [], subtotal: 0 });
    }
    const group = groupItemsByShop.get(shopId);
    const lineTotal = dbItem.price * qty;
    itemsSubtotal += lineTotal;
    group.subtotal += lineTotal;
    group.items.push({
      item: dbItem._id,
      name: dbItem.name,
      price: dbItem.price,
      quantity: qty,
      image: dbItem.image,
    });
  }

  if (groupItemsByShop.size > 1) {
    throw new ApiError(400, "Please place items from one restaurant per order");
  }

  const singleShopGroup = Array.from(groupItemsByShop.values())[0];
  if (singleShopGroup.shop.minOrderAmount > 0 && itemsSubtotal < singleShopGroup.shop.minOrderAmount) {
    throw new ApiError(
      400,
      `Minimum order amount for ${singleShopGroup.shop.name} is ₹${singleShopGroup.shop.minOrderAmount}`,
    );
  }

  const { coupon, discountAmount } = await validateAndComputeCoupon(couponCode, itemsSubtotal);
  const deliveryFee = calculateDeliveryFee(itemsSubtotal);
  const taxAmount = calculateTax(Math.max(0, itemsSubtotal - discountAmount));
  const totalAmount = Math.max(1, itemsSubtotal - discountAmount + deliveryFee + taxAmount);

  const shopOrders = Array.from(groupItemsByShop.values()).map((group) => ({
    shop: group.shop._id,
    owner: group.shop.owner,
    subtotal: group.subtotal,
    shopOrderItems: group.items,
  }));

  const normalizedAddress = {
    text: deliveryAddress.text.trim(),
    landmark: (deliveryAddress.landmark || "").trim(),
    latitude: Number(deliveryAddress.latitude),
    longitude: Number(deliveryAddress.longitude),
  };

  if (paymentMethod === "online") {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      throw new ApiError(
        503,
        "Online payments are not configured yet (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing). Please use Cash on Delivery.",
      );
    }

    const razorOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `qb_${Date.now()}`,
    });

    const newOrder = await Order.create({
      user: req.userId,
      paymentMethod: "online",
      paymentStatus: "pending",
      payment: false,
      deliveryAddress: normalizedAddress,
      itemsSubtotal,
      deliveryFee,
      taxAmount,
      discountAmount,
      couponCode: coupon ? coupon.code : "",
      totalAmount,
      shopOrders,
      razorpayOrderId: razorOrder.id,
    });

    return res.status(201).json({
      success: true,
      razorOrder,
      orderId: newOrder._id,
      orderNumber: newOrder.orderNumber,
      pricing: { itemsSubtotal, deliveryFee, taxAmount, discountAmount, totalAmount },
    });
  }

  const newOrder = await Order.create({
    user: req.userId,
    paymentMethod: "cod",
    paymentStatus: "pending",
    payment: false,
    deliveryAddress: normalizedAddress,
    itemsSubtotal,
    deliveryFee,
    taxAmount,
    discountAmount,
    couponCode: coupon ? coupon.code : "",
    totalAmount,
    shopOrders,
  });

  if (coupon) {
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
  }

  await newOrder.populate("shopOrders.shopOrderItems.item", "name image price");
  await newOrder.populate("shopOrders.shop", "name address city image");
  await newOrder.populate("shopOrders.owner", "fullName socketId");
  await newOrder.populate("user", "fullName email mobile");

  const io = req.app.get("io");
  await emitOrderToOwners(io, newOrder);

  return res.status(201).json({
    success: true,
    order: newOrder,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  if (!razorpay_payment_id || !orderId) {
    throw new ApiError(400, "Payment verification details are incomplete");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  if (String(order.user) !== String(req.userId)) {
    throw new ApiError(403, "Forbidden: You cannot verify payment for another user's order");
  }

  // Idempotent duplicate protection
  if (order.payment && order.paymentStatus === "paid") {
    await order.populate("shopOrders.shopOrderItems.item", "name image price");
    await order.populate("shopOrders.shop", "name address city image");
    return res.status(200).json({ success: true, order, message: "Payment already verified" });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const razorpay = getRazorpayClient();
  if (!secret || !razorpay) {
    throw new ApiError(503, "Razorpay credentials not configured");
  }

  const targetOrderId = razorpay_order_id || order.razorpayOrderId;
  if (!targetOrderId || targetOrderId !== order.razorpayOrderId) {
    throw new ApiError(400, "Razorpay order ID mismatch");
  }

  if (razorpay_signature) {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${order.razorpayOrderId}|${razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(razorpay_signature, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      order.paymentStatus = "failed";
      await order.save();
      throw new ApiError(400, "Invalid payment signature");
    }
  } else {
    throw new ApiError(400, "Payment signature is required");
  }

  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  if (!payment || !["captured", "authorized"].includes(payment.status)) {
    order.paymentStatus = "failed";
    await order.save();
    throw new ApiError(400, "Payment was not captured by Razorpay");
  }
  if (payment.order_id !== order.razorpayOrderId) {
    throw new ApiError(400, "Payment does not belong to this order");
  }
  if (Number(payment.amount) !== Math.round(order.totalAmount * 100) || payment.currency !== "INR") {
    throw new ApiError(400, "Payment amount or currency mismatch");
  }

  order.payment = true;
  order.paymentStatus = "paid";
  order.razorpayPaymentId = razorpay_payment_id;
  order.razorpaySignature = razorpay_signature;
  await order.save();

  if (order.couponCode) {
    await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }

  await order.populate("shopOrders.shopOrderItems.item", "name image price");
  await order.populate("shopOrders.shop", "name address city image");
  await order.populate("shopOrders.owner", "fullName socketId");
  await order.populate("user", "fullName email mobile");

  const io = req.app.get("io");
  await emitOrderToOwners(io, order);
  await createAndEmitNotification(io, {
    userId: order.user._id,
    title: "Payment Confirmed",
    message: `Payment of ₹${order.totalAmount} received for order ${order.orderNumber}.`,
    type: "payment",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    order,
  });
});

export const markPaymentFailed = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== String(req.userId)) {
    throw new ApiError(403, "Forbidden");
  }
  if (order.paymentStatus === "pending") {
    order.paymentStatus = "failed";
    await order.save();
  }
  return res.status(200).json({ success: true, order });
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new ApiError(503, "Webhook secret is not configured");
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    throw new ApiError(400, "Missing Razorpay webhook signature");
  }

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;

  if (paymentEntity?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (order) {
      if (event === "payment.captured" && order.paymentStatus !== "paid") {
        order.payment = true;
        order.paymentStatus = "paid";
        order.razorpayPaymentId = paymentEntity.id;
        await order.save();
      } else if (event === "payment.failed" && order.paymentStatus === "pending") {
        order.paymentStatus = "failed";
        await order.save();
      }
    }
  }

  return res.status(200).json({ status: "ok" });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, "User not found");

  if (user.role === "user") {
    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate("shopOrders.shop", "name address city image")
      .populate("shopOrders.owner", "fullName email mobile")
      .populate("shopOrders.shopOrderItems.item", "name image price")
      .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");

    return res.status(200).json({ success: true, orders });
  }

  if (user.role === "owner") {
    const orders = await Order.find({ "shopOrders.owner": req.userId })
      .sort({ createdAt: -1 })
      .populate("shopOrders.shop", "name address city image")
      .populate("user", "fullName email mobile")
      .populate("shopOrders.shopOrderItems.item", "name image price")
      .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");

    const filteredOrders = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      user: order.user,
      shopOrders: order.shopOrders.find(
        (o) => String(o.owner) === String(req.userId),
      ),
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      payment: order.payment,
      totalAmount: order.totalAmount,
    }));

    return res.status(200).json({ success: true, orders: filteredOrders });
  }

  throw new ApiError(403, "Use delivery or admin endpoints for this role");
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId, shopId } = req.params;
  const { status, reason = "" } = req.body;

  const order = await Order.findById(orderId).populate("shopOrders.shop", "name address location");
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const shopOrder = order.shopOrders.find(
    (o) => String(o.shop?._id || o.shop) === String(shopId),
  );
  if (!shopOrder) {
    throw new ApiError(404, "Restaurant sub-order not found");
  }

  const isOwner = String(shopOrder.owner) === String(req.userId);
  const isAdmin = req.userRole === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Forbidden: You do not own this restaurant order");
  }

  if (order.paymentMethod === "online" && order.paymentStatus !== "paid" && !["cancelled", "rejected"].includes(status)) {
    throw new ApiError(400, "Cannot process an unpaid online order");
  }

  const allowedNext = VALID_TRANSITIONS[shopOrder.status] || [];
  if (!allowedNext.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status transition from '${shopOrder.status}' to '${status}'`,
    );
  }

  shopOrder.status = status;
  if (["cancelled", "rejected"].includes(status)) {
    shopOrder.cancellationReason = reason || "Cancelled by restaurant";
    shopOrder.cancelledBy = isAdmin ? "admin" : "owner";
  }

  let deliveryBoyPayload = [];
  const io = req.app.get("io");

  if (status === "out of delivery" && !shopOrder.assignment) {
    const { latitude, longitude } = order.deliveryAddress;

    // Find online delivery boys near delivery location (15 km), fallback to any online delivery boys
    let nearByDeliveryBoys = await User.find({
      role: "deliveryBoy",
      isBlocked: { $ne: true },
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: 15000,
        },
      },
    }).select("fullName mobile location socketId");

    if (nearByDeliveryBoys.length === 0) {
      nearByDeliveryBoys = await User.find({
        role: "deliveryBoy",
        isBlocked: { $ne: true },
        isOnline: true,
      }).select("fullName mobile location socketId");
    }

    const nearByIds = nearByDeliveryBoys.map((b) => b._id);
    const busyIds = await DeliveryAssignment.find({
      assignedTo: { $in: nearByIds },
      status: { $in: ["assigned", "picked_up"] },
    }).distinct("assignedTo");

    const busyIdSet = new Set(busyIds.map((id) => String(id)));
    const availableBoys = nearByDeliveryBoys.filter(
      (b) => !busyIdSet.has(String(b._id)),
    );
    const candidates = availableBoys.map((b) => b._id);

    if (candidates.length === 0) {
      await order.save();
      if (io) {
        io.to(`user:${String(order.user)}`).emit("update-status", {
          orderId: order._id,
          shopId: shopOrder.shop._id || shopOrder.shop,
          status: shopOrder.status,
          userId: String(order.user),
        });
      }
      return res.status(200).json({
        success: true,
        shopOrder,
        availableBoys: [],
        assignment: null,
        message: "Order marked out for delivery, waiting for online delivery partners",
      });
    }

    const deliveryAssignment = await DeliveryAssignment.create({
      order: order._id,
      shop: shopOrder.shop._id || shopOrder.shop,
      shopOrderId: shopOrder._id,
      broadcastedTo: candidates,
      status: "broadcasted",
    });

    shopOrder.assignment = deliveryAssignment._id;
    deliveryBoyPayload = availableBoys.map((b) => ({
      id: b._id,
      fullName: b.fullName,
      longitude: b.location?.coordinates?.[0],
      latitude: b.location?.coordinates?.[1],
      mobile: b.mobile,
    }));

    await deliveryAssignment.populate("order");
    await deliveryAssignment.populate("shop", "name address location");

    if (io) {
      for (const boy of availableBoys) {
        io.to(`user:${String(boy._id)}`).emit("new-assignment", {
          sentTo: String(boy._id),
          assignmentId: deliveryAssignment._id,
          orderId: deliveryAssignment.order._id,
          orderNumber: deliveryAssignment.order.orderNumber,
          shopName: deliveryAssignment.shop.name,
          shopAddress: deliveryAssignment.shop.address,
          deliveryAddress: deliveryAssignment.order.deliveryAddress,
          items: shopOrder.shopOrderItems || [],
          subtotal: shopOrder.subtotal,
        });
      }
    }
  }

  await order.save();
  await order.populate("shopOrders.shop", "name address");
  await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile");

  const updatedShopOrder = order.shopOrders.find(
    (o) => String(o.shop?._id || o.shop) === String(shopId),
  );

  if (io) {
    const payload = {
      orderId: order._id,
      shopId: updatedShopOrder.shop._id,
      status: updatedShopOrder.status,
      userId: String(order.user),
    };
    io.to(`user:${String(order.user)}`).emit("update-status", payload);
    io.to(`order:${String(order._id)}`).emit("update-status", payload);
  }

  await createAndEmitNotification(io, {
    userId: order.user,
    title: `Order ${order.orderNumber} Update`,
    message: `Your order from ${updatedShopOrder.shop.name} is now ${updatedShopOrder.status}.`,
    type: "order",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    shopOrder: updatedShopOrder,
    assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy || null,
    availableBoys: deliveryBoyPayload,
    assignment: updatedShopOrder?.assignment || null,
  });
});

export const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { orderId, shopOrderId } = req.params;
  const { reason = "Cancelled by customer" } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== String(req.userId)) {
    throw new ApiError(403, "Forbidden: You can only cancel your own orders");
  }

  const shopOrder = order.shopOrders.id(shopOrderId);
  if (!shopOrder) throw new ApiError(404, "Order item group not found");

  if (!["pending", "confirmed"].includes(shopOrder.status)) {
    throw new ApiError(400, `Cannot cancel order once it is ${shopOrder.status}`);
  }

  shopOrder.status = "cancelled";
  shopOrder.cancellationReason = reason.trim();
  shopOrder.cancelledBy = "user";

  if (order.paymentMethod === "online" && order.paymentStatus === "paid" && order.razorpayPaymentId) {
    const razorpay = getRazorpayClient();
    if (razorpay) {
      try {
        const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
          amount: Math.round(order.totalAmount * 100),
        });
        order.refundId = refund.id;
        order.refundStatus = "initiated";
        order.paymentStatus = "refunded";
      } catch (err) {
        order.refundStatus = "failed";
        console.error("Razorpay refund failed:", err.message);
      }
    } else {
      order.refundStatus = "initiated";
      order.paymentStatus = "refunded";
    }
  }

  await order.save();

  const io = req.app.get("io");
  await createAndEmitNotification(io, {
    userId: shopOrder.owner,
    title: "Order Cancelled",
    message: `Order ${order.orderNumber} was cancelled by the customer.`,
    type: "order",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    order,
    message: "Order cancelled successfully",
  });
});

export const getDeliveryBoyAssignment = asyncHandler(async (req, res) => {
  const deliveryBoyId = req.userId;

  // Expire stale broadcasts cleanly
  await DeliveryAssignment.updateMany(
    { status: "broadcasted", expiresAt: { $lt: new Date() } },
    { status: "expired" },
  );

  const assignments = await DeliveryAssignment.find({
    broadcastedTo: deliveryBoyId,
    rejectedBy: { $ne: deliveryBoyId },
    status: "broadcasted",
  })
    .sort({ createdAt: -1 })
    .populate("order")
    .populate("shop", "name address city location");

  const formatted = assignments
    .filter((a) => a.order && a.shop)
    .map((a) => {
      const shopOrder = a.order.shopOrders.find((so) =>
        so._id.equals(a.shopOrderId),
      );
      return {
        assignmentId: a._id,
        orderId: a.order._id,
        orderNumber: a.order.orderNumber,
        shopName: a.shop.name,
        shopAddress: a.shop.address,
        shopLocation: a.shop.location,
        deliveryAddress: a.order.deliveryAddress,
        items: shopOrder?.shopOrderItems || [],
        subtotal: shopOrder?.subtotal || 0,
        deliveryEarning: shopOrder?.deliveryEarning || 50,
        expiresAt: a.expiresAt,
      };
    });

  return res.status(200).json({ success: true, assignments: formatted });
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const alreadyAssigned = await DeliveryAssignment.findOne({
    assignedTo: req.userId,
    status: { $in: ["assigned", "picked_up"] },
  });
  if (alreadyAssigned) {
    throw new ApiError(400, "Complete your active delivery before accepting a new one");
  }

  // Atomic check-and-assign prevents two delivery partners from accepting simultaneously
  const assignment = await DeliveryAssignment.findOneAndUpdate(
    {
      _id: assignmentId,
      status: "broadcasted",
      broadcastedTo: req.userId,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        assignedTo: req.userId,
        status: "assigned",
        acceptedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!assignment) {
    throw new ApiError(409, "Delivery request is no longer available or has expired");
  }

  const order = await Order.findById(assignment.order);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const shopOrder = order.shopOrders.id(assignment.shopOrderId);
  if (shopOrder) {
    shopOrder.assignedDeliveryBoy = req.userId;
    await order.save();
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`order:${String(order._id)}`).emit("delivery-assigned", {
      orderId: order._id,
      deliveryBoyId: req.userId,
    });
  }

  await createAndEmitNotification(io, {
    userId: order.user,
    title: "Delivery Partner Assigned",
    message: `A delivery partner is on the way to pick up your order ${order.orderNumber}.`,
    type: "delivery",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    message: "Order accepted successfully",
    assignment,
  });
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await DeliveryAssignment.findByIdAndUpdate(
    assignmentId,
    {
      $addToSet: { rejectedBy: req.userId },
      $pull: { broadcastedTo: req.userId },
    },
    { new: true },
  );

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  return res.status(200).json({
    success: true,
    message: "Delivery request declined",
  });
});

export const markOrderPickedUp = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await DeliveryAssignment.findOne({
    _id: assignmentId,
    assignedTo: req.userId,
    status: "assigned",
  });

  if (!assignment) {
    throw new ApiError(404, "Active assigned delivery not found");
  }

  assignment.status = "picked_up";
  await assignment.save();

  const order = await Order.findById(assignment.order);
  if (order) {
    const shopOrder = order.shopOrders.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.pickedUpAt = new Date();
      await order.save();
    }
  }

  return res.status(200).json({
    success: true,
    message: "Order marked as picked up from restaurant",
    assignment,
  });
});

export const getCurrentOrder = asyncHandler(async (req, res) => {
  const assignment = await DeliveryAssignment.findOne({
    assignedTo: req.userId,
    status: { $in: ["assigned", "picked_up"] },
  }).populate({
    path: "order",
    populate: [
      { path: "user", select: "fullName email location mobile" },
      { path: "shopOrders.shop", select: "name address city phone location" },
    ],
  });

  if (!assignment || !assignment.order) {
    return res.status(200).json({ success: true, currentOrder: null });
  }

  const shopOrder = assignment.order.shopOrders.find(
    (so) => String(so._id) === String(assignment.shopOrderId),
  );

  return res.status(200).json({
    success: true,
    currentOrder: {
      assignmentId: assignment._id,
      assignmentStatus: assignment.status,
      id: assignment.order._id,
      orderNumber: assignment.order.orderNumber,
      paymentMethod: assignment.order.paymentMethod,
      totalAmount: assignment.order.totalAmount,
      user: assignment.order.user,
      shopOrder,
      deliveryAddress: assignment.order.deliveryAddress,
    },
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId)
    .populate("user", "fullName email mobile")
    .populate("shopOrders.shop", "name address city phone location image")
    .populate("shopOrders.assignedDeliveryBoy", "fullName mobile location vehicleInfo")
    .populate("shopOrders.shopOrderItems.item", "name image price foodType")
    .lean();

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const isCustomer = String(order.user?._id) === String(req.userId);
  const isOwner = order.shopOrders.some((so) => String(so.owner) === String(req.userId));
  const isDelivery = order.shopOrders.some(
    (so) => so.assignedDeliveryBoy && String(so.assignedDeliveryBoy._id) === String(req.userId),
  );
  const isAdmin = req.userRole === "admin";

  if (!isCustomer && !isOwner && !isDelivery && !isAdmin) {
    throw new ApiError(403, "Forbidden: You are not authorized to view this order");
  }

  // Never expose OTP hashes
  order.shopOrders = order.shopOrders.map((so) => {
    const clean = { ...so };
    delete clean.deliveryOtpHash;
    return clean;
  });

  return res.status(200).json({ success: true, order });
});

export const getOrderInvoice = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId)
    .populate("user", "fullName email mobile")
    .populate("shopOrders.shop", "name address city state phone")
    .lean();

  if (!order) throw new ApiError(404, "Order not found");

  const isCustomer = String(order.user?._id) === String(req.userId);
  const isOwner = order.shopOrders.some((so) => String(so.owner) === String(req.userId));
  const isAdmin = req.userRole === "admin";

  if (!isCustomer && !isOwner && !isAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  return res.status(200).json({
    success: true,
    invoice: {
      invoiceNumber: `INV-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      customer: order.user,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      razorpayPaymentId: order.razorpayPaymentId || null,
      itemsSubtotal: order.itemsSubtotal,
      deliveryFee: order.deliveryFee,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      totalAmount: order.totalAmount,
      shopOrders: order.shopOrders.map((so) => ({
        shop: so.shop,
        status: so.status,
        subtotal: so.subtotal,
        items: so.shopOrderItems,
      })),
    },
  });
});

export const sendDeliveryOtp = asyncHandler(async (req, res) => {
  const { orderId, shopOrderId } = req.body;
  const order = await Order.findById(orderId).populate("user", "fullName email");
  if (!order) throw new ApiError(404, "Order not found");

  const shopOrder = order.shopOrders.id(shopOrderId);
  if (!shopOrder) throw new ApiError(404, "Sub-order not found");

  if (String(shopOrder.assignedDeliveryBoy) !== String(req.userId)) {
    throw new ApiError(403, "Forbidden: You are not assigned to this delivery");
  }

  const otp = generateOtp(6);
  shopOrder.deliveryOtpHash = hashOtp(otp);
  shopOrder.otpExpires = new Date(Date.now() + DELIVERY_OTP_EXPIRY_MS);
  shopOrder.otpAttempts = 0;
  shopOrder.isOtpVerified = false;
  await order.save();

  const mailResult = await sendDeliveryOtpMail(order.user, otp, order.orderNumber);

  // Also notify customer in-app with a notification (never expose OTP in production socket except via email)
  const io = req.app.get("io");
  await createAndEmitNotification(io, {
    userId: order.user._id,
    title: "Delivery Partner Arrived",
    message: mailResult.delivered
      ? `Check your email for the delivery verification OTP for order ${order.orderNumber}.`
      : `Delivery OTP generated for order ${order.orderNumber}.`,
    type: "delivery",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    message: mailResult.delivered
      ? "Delivery OTP sent to customer's email"
      : "Delivery OTP generated (configure EMAIL/PASS in .env to send emails)",
  });
});

export const verifyDeliveryOtp = asyncHandler(async (req, res) => {
  const { orderId, otp, shopOrderId } = req.body;
  if (!orderId || !shopOrderId || !otp) {
    throw new ApiError(400, "Order ID, sub-order ID, and OTP are required");
  }

  const order = await Order.findById(orderId).populate("user", "fullName email");
  if (!order) throw new ApiError(404, "Order not found");

  const shopOrder = order.shopOrders.id(shopOrderId);
  if (!shopOrder) throw new ApiError(404, "Sub-order not found");

  if (String(shopOrder.assignedDeliveryBoy) !== String(req.userId)) {
    throw new ApiError(403, "Forbidden: You are not assigned to this delivery");
  }

  if (!shopOrder.deliveryOtpHash || !shopOrder.otpExpires) {
    throw new ApiError(400, "Please send a delivery OTP first");
  }
  if (shopOrder.otpExpires.getTime() < Date.now()) {
    throw new ApiError(400, "Delivery OTP has expired. Please send a new OTP.");
  }
  if ((shopOrder.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(429, "Maximum OTP attempts exceeded. Please request a new OTP.");
  }

  if (!verifyOtpHash(otp, shopOrder.deliveryOtpHash)) {
    shopOrder.otpAttempts = (shopOrder.otpAttempts || 0) + 1;
    await order.save();
    const remaining = MAX_OTP_ATTEMPTS - shopOrder.otpAttempts;
    throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  shopOrder.status = "delivered";
  shopOrder.deliveredAt = new Date();
  shopOrder.isOtpVerified = true;
  shopOrder.deliveryOtpHash = null;
  shopOrder.otpExpires = null;
  shopOrder.otpAttempts = 0;

  if (order.paymentMethod === "cod" && order.shopOrders.every((so) => so.status === "delivered")) {
    order.payment = true;
    order.paymentStatus = "paid";
  }

  await order.save();

  await DeliveryAssignment.findOneAndUpdate(
    {
      shopOrderId: shopOrder._id,
      order: order._id,
      assignedTo: req.userId,
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
      },
    },
  );

  const io = req.app.get("io");
  if (io) {
    const payload = {
      orderId: order._id,
      shopId: shopOrder.shop,
      status: "delivered",
      userId: String(order.user._id),
    };
    io.to(`user:${String(order.user._id)}`).emit("update-status", payload);
    io.to(`order:${String(order._id)}`).emit("update-status", payload);
  }

  await createAndEmitNotification(io, {
    userId: order.user._id,
    title: "Order Delivered!",
    message: `Order ${order.orderNumber} has been delivered. Enjoy your meal!`,
    type: "delivery",
    orderId: order._id,
  });

  return res.status(200).json({
    success: true,
    message: "Order delivered successfully",
  });
});

export const getTodayDelivery = asyncHandler(async (req, res) => {
  const deliveryBoyId = req.userId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const orders = await Order.find({
    "shopOrders.assignedDeliveryBoy": deliveryBoyId,
    "shopOrders.status": "delivered",
  })
    .populate("shopOrders.shop", "name address")
    .sort({ "shopOrders.deliveredAt": -1 })
    .lean();

  const statsByHour = {};
  let todayCount = 0;
  let todayEarnings = 0;
  let monthEarnings = 0;
  let totalEarnings = 0;
  const history = [];

  for (const order of orders) {
    for (const so of order.shopOrders) {
      if (
        String(so.assignedDeliveryBoy) === String(deliveryBoyId) &&
        so.status === "delivered"
      ) {
        const earning = so.deliveryEarning || 50;
        const deliveredAt = so.deliveredAt ? new Date(so.deliveredAt) : new Date(order.updatedAt);
        totalEarnings += earning;

        if (deliveredAt >= startOfMonth) {
          monthEarnings += earning;
        }
        if (deliveredAt >= startOfDay) {
          todayCount += 1;
          todayEarnings += earning;
          const hour = deliveredAt.getHours();
          statsByHour[hour] = (statsByHour[hour] || 0) + 1;
        }

        history.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          shopName: so.shop?.name || "Restaurant",
          deliveryAddress: order.deliveryAddress?.text || "",
          subtotal: so.subtotal,
          earning,
          deliveredAt,
        });
      }
    }
  }

  const hourlyStats = Object.keys(statsByHour)
    .map((hour) => ({
      hour: parseInt(hour, 10),
      count: statsByHour[hour],
      earnings: statsByHour[hour] * 50,
    }))
    .sort((a, b) => a.hour - b.hour);

  return res.status(200).json({
    success: true,
    hourlyStats,
    summary: {
      todayCount,
      todayEarnings,
      monthEarnings,
      totalEarnings,
      totalDeliveries: history.length,
    },
    history: history.slice(0, 30),
  });
});
