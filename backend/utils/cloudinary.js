import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Failed to remove temp file:", err.message);
  }
};

const uploadOnCloudinary = async (filePath) => {
  if (!filePath) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRETE;

  // If Cloudinary credentials are not configured, serve the validated upload from /public
  if (!cloudName || !apiKey || !apiSecret) {
    const filename = path.basename(filePath);
    return `/uploads/${filename}`;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "quickbite",
      resource_type: "image",
    });
    safeUnlink(filePath);
    return result.secure_url;
  } catch (error) {
    safeUnlink(filePath);
    console.error("Cloudinary upload error:", error.message);
    throw new Error("Image upload failed");
  }
};

export default uploadOnCloudinary;
