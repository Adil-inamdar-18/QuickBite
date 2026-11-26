import mongoose from "mongoose";

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const validateObjectIds = (...paramNames) => (req, res, next) => {
  for (const name of paramNames) {
    const value = req.params[name];
    if (value && !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${name} format`,
      });
    }
  }
  next();
};

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value for ${field}`;
  } else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File size must be less than 5MB";
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== "test") {
    console.error("Server error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};
