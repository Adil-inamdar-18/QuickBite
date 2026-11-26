import Coupon from "../model/coupon.model.js";

export const FREE_DELIVERY_THRESHOLD = 499;
export const STANDARD_DELIVERY_FEE = 40;
export const TAX_RATE = 0.05; // 5% GST

export const calculateDeliveryFee = (subtotal) => {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
};

export const calculateTax = (taxableAmount) => {
  if (taxableAmount <= 0) return 0;
  return Math.round(taxableAmount * TAX_RATE);
};

export const validateAndComputeCoupon = async (couponCode, itemsSubtotal) => {
  if (!couponCode || !couponCode.trim()) {
    return { coupon: null, discountAmount: 0 };
  }

  const normalized = couponCode.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalized, isActive: true });

  if (!coupon) {
    throw new Error("Invalid or inactive coupon code");
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Coupon has expired");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }
  if (itemsSubtotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round((itemsSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.min(discountAmount, itemsSubtotal);
  return { coupon, discountAmount };
};
