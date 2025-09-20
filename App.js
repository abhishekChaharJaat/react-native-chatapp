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
