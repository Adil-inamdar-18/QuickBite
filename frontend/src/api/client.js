import axios from "axios";

export const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
});

export const resolveImageUrl = (src, fallback = "") => {
  if (!src || typeof src !== "string") return fallback;

  // External URLs or inline data
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  // Vite local assets (dev and build)
  if (
    src.startsWith("/src/") ||
    src.startsWith("/@fs/") ||
    src.startsWith("/@vite/") ||
    src.startsWith("/assets/") ||
    src.startsWith("src/assets/") ||
    src.startsWith("./assets/") ||
    src.includes("/assets/")
  ) {
    return src;
  }

  // Backend uploaded files
  if (src.startsWith("/uploads/")) {
    return `${SERVER_URL}${src}`;
  }
  if (src.startsWith("uploads/")) {
    return `${SERVER_URL}/${src}`;
  }

  // Root-relative paths
  if (src.startsWith("/")) {
    return `${SERVER_URL}${src}`;
  }

  return `${SERVER_URL}/uploads/${src}`;
};

export const getErrorMessage = (error, fallback = "Something went wrong") => {
  return error?.response?.data?.message || error?.message || fallback;
};
