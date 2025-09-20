import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = process.env.API_BASE_URL || "http://192.168.31.251:8000";

// Fetch messages
export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.token;

      if (!token) return rejectWithValue("No authentication token found");

      const res = await fetch(`${API_BASE_URL}/v2/messages/${userId}`, {
        headers: { Authorization: token },
      });

      if (!res.ok) return rejectWithValue("Failed to fetch messages");

      const data = await res.json();
      return {
        userId,
        messages: data.messages || [],
        currentUserId: auth.user?.id,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Send message
export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async ({ receiverId, message }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.token;

      if (!token) return rejectWithValue("No authentication token found");

      const res = await fetch(`${API_BASE_URL}/v2/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ receiverId, message }),
      });

      if (!res.ok) return rejectWithValue("Failed to send message");

      const data = await res.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Send image message
export const sendImageMessage = createAsyncThunk(
  "messages/sendImageMessage",
  async ({ receiverId, imageUri }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.token;

      if (!token) return rejectWithValue("No authentication token found");

      const formData = new FormData();
      formData.append('receiverId', receiverId);
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      const res = await fetch(`${API_BASE_URL}/v2/send-image`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData,
      });

      if (!res.ok) return rejectWithValue("Failed to send image");

      const data = await res.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete message
export const deleteMessage = createAsyncThunk(
  "messages/deleteMessage",
  async ({ messageId, chatId }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const token = auth.token;

      if (!token) return rejectWithValue("No authentication token found");

      const res = await fetch(`${API_BASE_URL}/v2/delete/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });

      if (!res.ok) return rejectWithValue("Failed to delete message");

      const data = await res.json();
      return { messageId, chatId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    messagesList: {},
    loading: false,
    fetchingMessages: false,
    error: null,
  },
  reducers: {
    addLocalMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.messagesList[chatId]) state.messagesList[chatId] = [];
      state.messagesList[chatId].push(message);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.fetchingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.fetchingMessages = false;
        const { userId, messages } = action.payload;
        state.messagesList[userId] = messages.map((msg, index) => ({
          id: msg._id || msg.messageId || `msg_${index}`,
          text: msg.message || msg.text || "",
          senderId: msg.sender,
          timestamp: msg.timestamp,
          messageType: msg.messageType || 'text',
          imageUrl: msg.imageUrl,
        }));
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.fetchingMessages = false;
        state.error = action.payload;
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Send image message
      .addCase(sendImageMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendImageMessage.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendImageMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete message
      .addCase(deleteMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { messageId, chatId } = action.payload;
        // Remove the message from the local state
        if (state.messagesList[chatId]) {
          state.messagesList[chatId] = state.messagesList[chatId].filter(
            (msg) => msg.id !== messageId
          );
        }
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addLocalMessage, clearError } = messagesSlice.actions;
export default messagesSlice.reducer;
