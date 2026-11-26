import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";

export const genToken = (userId, role) => {
  return jwt.sign({ userId: String(userId), role }, getJwtSecret(), {
    expiresIn: "7d",
  });
};

export const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

export default genToken;
