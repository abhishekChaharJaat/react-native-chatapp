import React, { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { signupUser, clearError } from "../store/authSlice";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function Signup({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, token } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated && token) {
      navigation.replace("Users");
      Toast.show({
        type: "success",
        text1: "Signup Successful",
        text2: "Welcome to the app! 🎉",
        position: "top",
        visibilityTime: 2500,
        autoHide: true,
        topOffset: 50,
        props: { customStyle: { borderRadius: 12 } },
      });
    }
  }, [isAuthenticated, token, navigation]);

  useEffect(() => {
    if (error) {
      Alert.alert("Signup Failed", error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }
    const result = await dispatch(signupUser({ name, email, password }));

    if (signupUser.fulfilled.match(result) && !result.payload.token) {
      Alert.alert(
        "Signup Successful",
        "Account created successfully. Please login to continue.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <Text style={styles.appName}>Abhishek's App</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Name"
            placeholderTextColor="#666"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={{ fontWeight: "bold" }}>Login</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F5", // Soft pink background
    padding: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#E57373",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 2,
  },
  button: {
    backgroundColor: "#E57373",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    // Shadow for iOS
    shadowColor: "#E57373",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Shadow for Android
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkText: {
    color: "#007AFF",
    marginTop: 20,
    textAlign: "center",
    fontSize: 15,
  },
});
