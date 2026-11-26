import express from "express";
import isAuth, { optionalAuth } from "../middlewares/isAuth.js";
import { authorizeRoles } from "../middlewares/authorize.js";
import { validateObjectIds } from "../middlewares/errorHandler.js";
import {
  addItem,
  deleteItem,
  editItem,
  getItemByCity,
  getItemById,
  getItemsByShop,
  getMyReviews,
  getPublicCategories,
  rating,
  searchItems,
  toggleItemAvailability,
} from "../controllers/item.controllers.js";
import { upload } from "../middlewares/multer.js";

const itemRouter = express.Router();

itemRouter.post("/add-item", isAuth, authorizeRoles("owner", "admin"), upload.single("image"), addItem);
itemRouter.post("/edit-item/:itemId", isAuth, authorizeRoles("owner", "admin"), validateObjectIds("itemId"), upload.single("image"), editItem);
itemRouter.patch("/toggle-availability/:itemId", isAuth, authorizeRoles("owner", "admin"), validateObjectIds("itemId"), toggleItemAvailability);
itemRouter.get("/get-by-id/:itemId", isAuth, validateObjectIds("itemId"), getItemById);
itemRouter.delete("/delete/:itemId", isAuth, authorizeRoles("owner", "admin"), validateObjectIds("itemId"), deleteItem);
itemRouter.get("/delete/:itemId", isAuth, authorizeRoles("owner", "admin"), validateObjectIds("itemId"), deleteItem);

itemRouter.get("/categories", getPublicCategories);
itemRouter.get("/get-by-city/:city", optionalAuth, getItemByCity);
itemRouter.get("/get-by-shop/:shopId", optionalAuth, validateObjectIds("shopId"), getItemsByShop);
itemRouter.get("/search-items", optionalAuth, searchItems);

itemRouter.post("/rating", isAuth, authorizeRoles("user"), rating);
itemRouter.get("/my-reviews", isAuth, authorizeRoles("user"), getMyReviews);

export default itemRouter;
