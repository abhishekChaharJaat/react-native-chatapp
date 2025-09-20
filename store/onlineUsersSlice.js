import { createSlice } from "@reduxjs/toolkit";

const onlineUsersSlice = createSlice({
  name: "onlineUsers",
  initialState: {
    onlineUserIds: [], // Array of user IDs that are currently online
  },
  reducers: {
    setUserOnline: (state, action) => {
      const userId = action.payload;
      if (!state.onlineUserIds.includes(userId)) {
        state.onlineUserIds.push(userId);
      }
    },
    setUserOffline: (state, action) => {
      const userId = action.payload;
      state.onlineUserIds = state.onlineUserIds.filter((id) => id !== userId);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUserIds = action.payload;
    },
    clearOnlineUsers: (state) => {
      state.onlineUserIds = [];
    },
  },
});

export const {
  setUserOnline,
  setUserOffline,
  setOnlineUsers,
  clearOnlineUsers,
} = onlineUsersSlice.actions;
export default onlineUsersSlice.reducer;
