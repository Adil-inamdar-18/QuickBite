import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Item image is required"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      required: [true, "Price is required"],
    },
    foodType: {
      type: String,
      enum: ["veg", "non veg"],
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      default: 15,
      min: 1,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

itemSchema.index({ shop: 1, category: 1 });

const Item = mongoose.model("Item", itemSchema);
export default Item;
