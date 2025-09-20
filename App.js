import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Provider, useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "./store/store";
import UserListPage from "./pages/UserListPage";
import ChatPage from "./pages/ChatPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Toast from "react-native-toast-message";
import { loadTokenFromStorage } from "./store/authSlice";
import { View, ActivityIndicator, Text } from "react-native";
import socketService from "./services/socketService";
import { addReceivedMessage } from "./store/messagesSlice";
import { setUserOnline, setUserOffline, setOnlineUsers, clearOnlineUsers } from "./store/onlineUsersSlice";

const Stack = createStackNavigator();

function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await dispatch(loadTokenFromStorage());
      } catch (error) {
        console.log("No stored token found");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Connect to WebSocket when user is authenticated
      socketService.connect('http://192.168.31.251:8000', user.id);

      // Set up global message listener
      const handleGlobalMessage = (data) => {
        console.log('Global message received:', data);
        // Add received message to the store
        dispatch(addReceivedMessage({
          senderId: data.senderId,
          message: {
            id: data.messageId || Date.now().toString(),
            text: data.message,
            senderId: data.senderId,
            timestamp: data.timestamp || new Date().toISOString(),
          }
        }));
      };

      // Handle user online/offline events
      const handleUserOnlineStatus = (userId) => {
        console.log('User online:', userId);
        dispatch(setUserOnline(userId));
      };

      const handleUserOfflineStatus = (userId) => {
        console.log('User offline:', userId);
        dispatch(setUserOffline(userId));
      };

      // Handle online users list
      const handleOnlineUsersList = (userIds) => {
        console.log('Online users:', userIds);
        dispatch(setOnlineUsers(userIds));
      };

      // Add listeners
      socketService.addListener('receive_message', handleGlobalMessage);
      socketService.addListener('user_online', handleUserOnlineStatus);
      socketService.addListener('user_offline', handleUserOfflineStatus);
      socketService.addListener('online_users_list', handleOnlineUsersList);

      return () => {
        // Clean up listeners on unmount
        socketService.removeListener('receive_message', handleGlobalMessage);
        socketService.removeListener('user_online', handleUserOnlineStatus);
        socketService.removeListener('user_offline', handleUserOfflineStatus);
        socketService.removeListener('online_users_list', handleOnlineUsersList);
      };
    } else {
      // Disconnect when user logs out
      socketService.disconnect();
      dispatch(clearOnlineUsers());
    }
  }, [isAuthenticated, user?.id, dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isAuthenticated ? "Users" : "Login"}>
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={Signup}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Users"
          component={UserListPage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatPage}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
      <Toast />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}
