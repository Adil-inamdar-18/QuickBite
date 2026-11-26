import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "owner", "deliveryBoy", "admin"],
      default: "user",
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    savedAddresses: [
      {
        label: { type: String, default: "Home" },
        text: { type: String, required: true },
        landmark: { type: String, default: "" },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
    ],
    favoriteItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    vehicleInfo: {
      type: { type: String, default: "Bike" },
      number: { type: String, default: "" },
    },
    resetOtpHash: {
      type: String,
      select: false,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otpExpires: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLastSentAt: {
      type: Date,
    },
    socketId: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);
export default User;
