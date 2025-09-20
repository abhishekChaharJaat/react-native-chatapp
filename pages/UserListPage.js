import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../store/usersSlice";
import { logout } from "../store/authSlice";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

export default function UserListPage({ navigation }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const dispatch = useDispatch();
  const { users, loading, refreshing, error } = useSelector((state) => state.users);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const handleUserPress = (user) => {
    navigation.navigate("Chat", { user });
  };

  const handleLogout = async () => {
    setSidebarVisible(false);
    await dispatch(logout());
    navigation.replace("Login");
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace("Login");
      return;
    }
    dispatch(fetchUsers());
  }, [dispatch, isAuthenticated, navigation]);

  useEffect(() => {
    if (error) {
      if (error.includes("Session expired") || error.includes("No authentication token")) {
        Alert.alert("Session Expired", "Please login again.");
        dispatch(logout());
        navigation.replace("Login");
      } else {
        Alert.alert("Error", error);
      }
    }
  }, [error, dispatch, navigation]);

  const onRefresh = () => {
    dispatch(fetchUsers({ isRefresh: true }));
  };

  const retryFetch = () => {
    dispatch(fetchUsers());
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            item.status === "Online" && styles.online,
            item.status === "Away" && styles.away,
            item.status === "Offline" && styles.offline,
          ]}
        />
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users available</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={sidebarVisible}
        onRequestClose={toggleSidebar}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleSidebar}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Menu</Text>
            </View>

            <View style={styles.sidebarContent}>
              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={handleLogout}
              >
                <Text style={styles.logoutIcon}>⎋</Text>
                <Text style={styles.sidebarItemText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    marginRight: 15,
    padding: 3,
  },
  menuIcon: {
    fontSize: 28,
    color: "#fff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    backgroundColor: "#fff",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarHeader: {
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    fontSize: 24,
    color: "#fff",
  },
  sidebarContent: {
    padding: 20,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 10,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 15,
    color: "#FF3B30",
  },
  sidebarItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  listContainer: {
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  statusContainer: {
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  online: {
    backgroundColor: "#4CAF50",
  },
  away: {
    backgroundColor: "#FFC107",
  },
  offline: {
    backgroundColor: "#9E9E9E",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
});