import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.31.251:8000';

// Async thunk for fetching users
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        return rejectWithValue('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/v1/users`, {
        method: 'GET',
        headers: {
          'Authorization': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          return rejectWithValue('Session expired. Please login again.');
        }
        return rejectWithValue(data.message || 'Failed to fetch users');
      }

      // Transform the API data to show name and email
      const transformedUsers = data.map((user) => ({
        id: user.id || user._id || String(Math.random()),
        name: user.name || 'Unknown User',
        email: user.email || 'No email',
        status: 'Online', // Default status since API provides name and email
      }));

      return transformedUsers;
    } catch (error) {
      return rejectWithValue('Network error. Please check your connection.');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    loading: false,
    refreshing: false,
    error: null,
  },
  reducers: {
    clearUsersError: (state) => {
      state.error = null;
    },
    clearUsers: (state) => {
      state.users = [];
      state.error = null;
    },
    setRefreshing: (state, action) => {
      state.refreshing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state, action) => {
        // Don't show loading if it's a refresh
        if (action.meta.arg?.isRefresh) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.users = action.payload;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload;
      });
  },
});

export const { clearUsersError, clearUsers, setRefreshing } = usersSlice.actions;
export default usersSlice.reducer;