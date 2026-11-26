import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { authorizeRoles } from "../middlewares/authorize.js";
import { validateObjectIds } from "../middlewares/errorHandler.js";
import {
  acceptOrder,
  cancelOrderByCustomer,
  getCurrentOrder,
  getDeliveryBoyAssignment,
  getMyOrders,
  getOrderById,
  getOrderInvoice,
  getTodayDelivery,
  markOrderPickedUp,
  markPaymentFailed,
  placeOrder,
  razorpayWebhook,
  rejectOrder,
  sendDeliveryOtp,
  updateOrderStatus,
  validateCouponCode,
  verifyDeliveryOtp,
  verifyPayment,
} from "../controllers/order.controller.js";

const orderRouter = express.Router();

// Razorpay server-to-server webhook (signature verified)
orderRouter.post("/webhook", razorpayWebhook);

// Customer routes
orderRouter.post("/validate-coupon", isAuth, authorizeRoles("user"), validateCouponCode);
orderRouter.post("/place-order", isAuth, authorizeRoles("user"), placeOrder);
orderRouter.post("/verify-payment", isAuth, authorizeRoles("user"), verifyPayment);
orderRouter.post("/payment-failed", isAuth, authorizeRoles("user"), markPaymentFailed);
orderRouter.post("/cancel/:orderId/:shopOrderId", isAuth, authorizeRoles("user"), validateObjectIds("orderId", "shopOrderId"), cancelOrderByCustomer);

// Customer & Owner order listings
orderRouter.get("/my-orders", isAuth, authorizeRoles("user", "owner"), getMyOrders);

// Owner order management
orderRouter.post("/update-status/:orderId/:shopId", isAuth, authorizeRoles("owner", "admin"), validateObjectIds("orderId", "shopId"), updateOrderStatus);

// Delivery Partner routes
orderRouter.get("/get-assignments", isAuth, authorizeRoles("deliveryBoy"), getDeliveryBoyAssignment);
orderRouter.get("/accept-order/:assignmentId", isAuth, authorizeRoles("deliveryBoy"), validateObjectIds("assignmentId"), acceptOrder);
orderRouter.post("/reject-order/:assignmentId", isAuth, authorizeRoles("deliveryBoy"), validateObjectIds("assignmentId"), rejectOrder);
orderRouter.post("/pickup/:assignmentId", isAuth, authorizeRoles("deliveryBoy"), validateObjectIds("assignmentId"), markOrderPickedUp);
orderRouter.get("/get-current-order", isAuth, authorizeRoles("deliveryBoy"), getCurrentOrder);
orderRouter.post("/send-delivery-otp", isAuth, authorizeRoles("deliveryBoy"), sendDeliveryOtp);
orderRouter.post("/verify-delivery-otp", isAuth, authorizeRoles("deliveryBoy"), verifyDeliveryOtp);
orderRouter.get("/get-today-delivery", isAuth, authorizeRoles("deliveryBoy"), getTodayDelivery);

// Shared authorized order detail & invoice
orderRouter.get("/get-order-by-id/:orderId", isAuth, validateObjectIds("orderId"), getOrderById);
orderRouter.get("/invoice/:orderId", isAuth, validateObjectIds("orderId"), getOrderInvoice);

export default orderRouter;
