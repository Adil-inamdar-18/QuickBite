import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { authorizeRoles } from "../middlewares/authorize.js";
import { validateObjectIds } from "../middlewares/errorHandler.js";
import {
  createCategoryAdmin,
  createCouponAdmin,
  deleteCategoryAdmin,
  deleteCouponAdmin,
  getAdminOverview,
  getAllCategoriesAdmin,
  getAllCouponsAdmin,
  getAllOrdersAdmin,
  getAllShopsAdmin,
  getAllSupportTicketsAdmin,
  getAllUsers,
  toggleBlockUser,
  toggleCategoryAdmin,
  toggleCouponAdmin,
  updateShopStatusAdmin,
  updateSupportTicketAdmin,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

adminRouter.use(isAuth, authorizeRoles("admin"));

adminRouter.get("/overview", getAdminOverview);

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:userId/toggle-block", validateObjectIds("userId"), toggleBlockUser);

adminRouter.get("/shops", getAllShopsAdmin);
adminRouter.patch("/shops/:shopId/status", validateObjectIds("shopId"), updateShopStatusAdmin);

adminRouter.get("/orders", getAllOrdersAdmin);

adminRouter.get("/categories", getAllCategoriesAdmin);
adminRouter.post("/categories", createCategoryAdmin);
adminRouter.patch("/categories/:categoryId/toggle", validateObjectIds("categoryId"), toggleCategoryAdmin);
adminRouter.delete("/categories/:categoryId", validateObjectIds("categoryId"), deleteCategoryAdmin);

adminRouter.get("/coupons", getAllCouponsAdmin);
adminRouter.post("/coupons", createCouponAdmin);
adminRouter.patch("/coupons/:couponId/toggle", validateObjectIds("couponId"), toggleCouponAdmin);
adminRouter.delete("/coupons/:couponId", validateObjectIds("couponId"), deleteCouponAdmin);

adminRouter.get("/support", getAllSupportTicketsAdmin);
adminRouter.patch("/support/:ticketId", validateObjectIds("ticketId"), updateSupportTicketAdmin);

export default adminRouter;
