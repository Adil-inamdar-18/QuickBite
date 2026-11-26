import { createSlice } from "@reduxjs/toolkit";

const loadCartFromStorage = () => {
  try {
    const raw = localStorage.getItem("qb_cart_v1");
    if (!raw) return { items: [], shopId: null, shopName: "" };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      items,
      shopId: parsed.shopId || items[0]?.shop || null,
      shopName: parsed.shopName || items[0]?.shopName || "",
    };
  } catch {
    return { items: [], shopId: null, shopName: "" };
  }
};

const saveCartToStorage = (items, shopId, shopName) => {
  try {
    localStorage.setItem(
      "qb_cart_v1",
      JSON.stringify({ items, shopId, shopName }),
    );
  } catch {
    // Ignore storage quota errors
  }
};

const computeTotal = (items) =>
  items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);

const initialCart = loadCartFromStorage();

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    authChecked: false,
    currentCity: localStorage.getItem("qb_city") || "Pune",
    currentState: "",
    currentAddress: "",
    shopInMyCity: [],
    itemsInMyCity: [],
    cartItems: initialCart.items,
    cartShopId: initialCart.shopId,
    cartShopName: initialCart.shopName,
    totalAmount: computeTotal(initialCart.items),
    myOrders: [],
    searchItems: null,
    searchShops: [],
    notifications: [],
    unreadCount: 0,
    socket: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload;
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload;
      if (action.payload) {
        try {
          localStorage.setItem("qb_city", action.payload);
        } catch {
          // ignore
        }
      }
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload;
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload;
    },
    setShopInMyCity: (state, action) => {
      state.shopInMyCity = action.payload || [];
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload || [];
    },
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    addToCart: (state, action) => {
      const cartItem = action.payload;
      const itemShopId = typeof cartItem.shop === "object" ? cartItem.shop?._id : cartItem.shop;
      const itemShopName = cartItem.shopName || cartItem.shop?.name || "";

      if (state.cartItems.length > 0 && state.cartShopId && itemShopId && state.cartShopId !== itemShopId) {
        if (!cartItem.replaceCart) {
          return;
        }
        state.cartItems = [];
      }

      const normalizedItem = {
        ...cartItem,
        shop: itemShopId,
        shopName: itemShopName,
      };
      delete normalizedItem.replaceCart;

      const existingItem = state.cartItems.find((i) => i.id === normalizedItem.id);
      if (existingItem) {
        existingItem.quantity += normalizedItem.quantity;
      } else {
        state.cartItems.push(normalizedItem);
      }

      state.cartShopId = itemShopId || state.cartShopId;
      state.cartShopName = itemShopName || state.cartShopName;
      state.totalAmount = computeTotal(state.cartItems);
      saveCartToStorage(state.cartItems, state.cartShopId, state.cartShopName);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        state.cartItems = state.cartItems.filter((i) => i.id !== id);
      } else {
        const item = state.cartItems.find((i) => i.id === id);
        if (item) item.quantity = quantity;
      }
      if (state.cartItems.length === 0) {
        state.cartShopId = null;
        state.cartShopName = "";
      }
      state.totalAmount = computeTotal(state.cartItems);
      saveCartToStorage(state.cartItems, state.cartShopId, state.cartShopName);
    },
    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter((i) => i.id !== action.payload);
      if (state.cartItems.length === 0) {
        state.cartShopId = null;
        state.cartShopName = "";
      }
      state.totalAmount = computeTotal(state.cartItems);
      saveCartToStorage(state.cartItems, state.cartShopId, state.cartShopName);
    },
    clearCart: (state) => {
      state.cartItems = [];
      state.cartShopId = null;
      state.cartShopName = "";
      state.totalAmount = 0;
      saveCartToStorage([], null, "");
    },
    setMyOrders: (state, action) => {
      state.myOrders = action.payload || [];
    },
    addMyOrder: (state, action) => {
      const incoming = action.payload;
      if (!incoming?._id) return;
      const exists = state.myOrders.some((o) => o._id === incoming._id);
      if (!exists) {
        state.myOrders = [incoming, ...state.myOrders];
      }
    },
    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload;
      const order = state.myOrders.find((o) => o._id === orderId);
      if (order?.shopOrders) {
        if (Array.isArray(order.shopOrders)) {
          const so = order.shopOrders.find((s) => (s.shop?._id || s.shop) === shopId);
          if (so) so.status = status;
        } else if ((order.shopOrders.shop?._id || order.shopOrders.shop) === shopId) {
          order.shopOrders.status = status;
        }
      }
    },
    updateRealTimeOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload;
      const order = state.myOrders.find((o) => o._id === orderId);
      if (order?.shopOrders) {
        if (Array.isArray(order.shopOrders)) {
          const shopOrder = order.shopOrders.find((so) => (so.shop?._id || so.shop) === shopId);
          if (shopOrder) shopOrder.status = status;
        } else if ((order.shopOrders.shop?._id || order.shopOrders.shop) === shopId) {
          order.shopOrders.status = status;
        }
      }
    },
    setSearchItems: (state, action) => {
      state.searchItems = action.payload;
    },
    setSearchShops: (state, action) => {
      state.searchShops = action.payload || [];
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload.notifications || [];
      state.unreadCount = action.payload.unreadCount || 0;
    },
    addNotification: (state, action) => {
      state.notifications = [action.payload, ...state.notifications].slice(0, 40);
      state.unreadCount += 1;
    },
    markAllNotificationsReadState: (state) => {
      state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
      state.unreadCount = 0;
    },
    markNotificationReadState: (state, action) => {
      const id = action.payload;
      const target = state.notifications.find((n) => n._id === id);
      if (target && !target.isRead) {
        target.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
  },
});

export const {
  setUserData,
  setAuthChecked,
  setCurrentCity,
  setCurrentState,
  setCurrentAddress,
  setShopInMyCity,
  setItemsInMyCity,
  addToCart,
  updateQuantity,
  removeCartItem,
  clearCart,
  setMyOrders,
  addMyOrder,
  updateOrderStatus,
  setSearchItems,
  setSearchShops,
  setSocket,
  updateRealTimeOrderStatus,
  setNotifications,
  addNotification,
  markAllNotificationsReadState,
  markNotificationReadState,
} = userSlice.actions;

export default userSlice.reducer;
