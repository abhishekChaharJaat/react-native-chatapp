import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;