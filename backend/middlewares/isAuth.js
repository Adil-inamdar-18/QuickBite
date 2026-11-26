import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

const getCookieSecret = () => process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";

export const extractTokenFromRequest = (req) => {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const isAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: Authentication required" });
    }

    const decoded = jwt.verify(token, getCookieSecret());
    const user = await User.findById(decoded.userId).select("_id role isBlocked fullName email");

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User no longer exists" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Account is suspended. Please contact support." });
    }

    req.userId = String(user._id);
    req.userRole = user.role;
    req.authUser = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid authentication token" });
    }
    return res.status(500).json({ success: false, message: "Authentication failed" });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return next();
    const decoded = jwt.verify(token, getCookieSecret());
    const user = await User.findById(decoded.userId).select("_id role isBlocked");
    if (user && !user.isBlocked) {
      req.userId = String(user._id);
      req.userRole = user.role;
    }
  } catch {
    // Ignore invalid optional tokens so public browsing still works
  }
  next();
};

export default isAuth;
