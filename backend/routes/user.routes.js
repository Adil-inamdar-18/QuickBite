import express from "express";
import {
  addSavedAddress,
  changePassword,
  createSupportTicket,
  deleteSavedAddress,
  getCurrentUser,
  getMySupportTickets,
  getNotifications,
  markNotificationsRead,
  setDefaultAddress,
  toggleFavoriteItem,
  toggleFavoriteShop,
  toggleOnlineStatus,
  updateProfile,
  updateUserLocation,
} from "../controllers/user.controller.js";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import { validateObjectIds } from "../middlewares/errorHandler.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.put("/profile", isAuth, upload.single("avatar"), updateProfile);
userRouter.post("/change-password", isAuth, changePassword);
userRouter.post("/update-location", isAuth, updateUserLocation);
userRouter.post("/toggle-online", isAuth, toggleOnlineStatus);

userRouter.post("/addresses", isAuth, addSavedAddress);
userRouter.delete("/addresses/:addressId", isAuth, validateObjectIds("addressId"), deleteSavedAddress);
userRouter.patch("/addresses/:addressId/default", isAuth, validateObjectIds("addressId"), setDefaultAddress);

userRouter.post("/favorites/shop/:shopId", isAuth, validateObjectIds("shopId"), toggleFavoriteShop);
userRouter.post("/favorites/item/:itemId", isAuth, validateObjectIds("itemId"), toggleFavoriteItem);

userRouter.get("/notifications", isAuth, getNotifications);
userRouter.post("/notifications/read", isAuth, markNotificationsRead);

userRouter.post("/support", isAuth, createSupportTicket);
userRouter.get("/support", isAuth, getMySupportTickets);

export default userRouter;
