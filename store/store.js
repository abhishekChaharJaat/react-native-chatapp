import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import usersReducer from "./usersSlice";
import messagesReducer from "./messagesSlice";
import onlineUsersReducer from "./onlineUsersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    messages: messagesReducer,
    onlineUsers: onlineUsersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

// Type exports for TypeScript (if needed, convert this file to .ts)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
