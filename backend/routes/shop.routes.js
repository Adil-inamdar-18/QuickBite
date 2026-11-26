import express from "express";
import {
  createEditShop,
  getMyShop,
  getOwnerAnalytics,
  getShopByCity,
  toggleShopStatus,
} from "../controllers/shop.controller.js";
import isAuth, { optionalAuth } from "../middlewares/isAuth.js";
import { authorizeRoles } from "../middlewares/authorize.js";
import { upload } from "../middlewares/multer.js";

const shopRouter = express.Router();

shopRouter.post("/create-edit", isAuth, authorizeRoles("owner", "admin"), upload.single("image"), createEditShop);
shopRouter.get("/get-my", isAuth, authorizeRoles("owner", "admin"), getMyShop);
shopRouter.post("/toggle-status", isAuth, authorizeRoles("owner"), toggleShopStatus);
shopRouter.get("/analytics", isAuth, authorizeRoles("owner", "admin"), getOwnerAnalytics);
shopRouter.get("/get-by-city/:city", optionalAuth, getShopByCity);

export default shopRouter;
