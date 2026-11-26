import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Shop image is required"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    cuisines: {
      type: [String],
      default: [],
    },
    phone: {
      type: String,
      default: "",
    },
    openingTime: {
      type: String,
      default: "09:00",
    },
    closingTime: {
      type: String,
      default: "23:00",
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    deliveryTime: {
      type: String,
      default: "25-35 mins",
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [73.8567, 18.5204] },
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
  },
  { timestamps: true },
);

shopSchema.index({ location: "2dsphere" });
shopSchema.index({ city: 1 });

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
