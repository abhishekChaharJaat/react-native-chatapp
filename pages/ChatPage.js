import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useDispatch, useSelector } from "react-redux";
import {
  sendMessage,
  fetchMessages,
  addLocalMessage,
  deleteMessage,
  sendImageMessage,
  removeDeletedMessage,
} from "../store/messagesSlice";
import socketService from "../services/socketService";

export default function ChatPage({ route, navigation }) {
  const user = route?.params?.user;
  const dispatch = useDispatch();
  const { messagesList, loading, fetchingMessages, error } = useSelector(
    (state) => state.messages
  );
  const { user: currentUser } = useSelector((state) => state.auth);

  const [inputText, setInputText] = useState("");
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageMessage, setSelectedImageMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userOnlineStatus, setUserOnlineStatus] = useState(false);
  const flatListRef = useRef();
  const typingTimeoutRef = useRef(null);

  // Get messages for this user from Redux store
  const messages = messagesList[user?.id] || [];

  // Fetch messages when component mounts
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchMessages(user.id));
    }
  }, [dispatch, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Set up WebSocket listeners for this specific chat
  useEffect(() => {
    // Note: Incoming messages are handled globally in App.js
    // Here we only need to handle typing and online status for this specific user

    // Listen for user online status
    const handleUserOnline = (userId) => {
      if (userId === user?.id) {
        setUserOnlineStatus(true);
      }
    };

    const handleUserOffline = (userId) => {
      if (userId === user?.id) {
        setUserOnlineStatus(false);
      }
    };

    // Listen for typing indicators
    const handleUserTyping = (userId) => {
      if (userId === user?.id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (userId) => {
      if (userId === user?.id) {
        setIsTyping(false);
      }
    };

    // Handle remote message deletion
    const handleMessageDeleted = (data) => {
      const { messageId, deletedBy } = data;
      // If the deletion is from the user we're chatting with
      if (deletedBy === user?.id) {
        dispatch(removeDeletedMessage({ messageId, chatId: user?.id }));
      }
    };

    // Add listeners (not including receive_message as it's handled globally)
    socketService.addListener('user_online', handleUserOnline);
    socketService.addListener('user_offline', handleUserOffline);
    socketService.addListener('user_typing', handleUserTyping);
    socketService.addListener('user_stopped_typing', handleUserStoppedTyping);
    socketService.addListener('message_deleted', handleMessageDeleted);

    // Cleanup listeners on unmount
    return () => {
      socketService.removeListener('user_online', handleUserOnline);
      socketService.removeListener('user_offline', handleUserOffline);
      socketService.removeListener('user_typing', handleUserTyping);
      socketService.removeListener('user_stopped_typing', handleUserStoppedTyping);
      socketService.removeListener('message_deleted', handleMessageDeleted);
    };
  }, [user?.id, dispatch]);

  // Handle typing indicator
  const handleTyping = (text) => {
    setInputText(text);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      // Send typing indicator
      socketService.startTyping(user?.id);

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(user?.id);
      }, 2000);
    } else {
      // Stop typing immediately if text is empty
      socketService.stopTyping(user?.id);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      senderId: currentUser?.id,
    };

    // Add message to Redux store immediately for better UX
    dispatch(
      addLocalMessage({
        chatId: user?.id,
        message: newMessage,
      })
    );

    const currentMessage = inputText;
    setInputText("");

    // Stop typing indicator
    socketService.stopTyping(user?.id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send message via WebSocket for real-time delivery
    socketService.sendMessage(user?.id, currentMessage, currentUser?.id);

    // Scroll to bottom after sending
    setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);

    // Dispatch Redux action to send message to API (for persistence)
    dispatch(
      sendMessage({
        receiverId: user?.id || "default-receiver",
        message: currentMessage,
      })
    );
  };

  const handleDeleteMessage = (message) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Use mongoId if available (for fetched messages), otherwise use id (for local messages)
            const deleteId = message.mongoId || message.id;
            dispatch(deleteMessage({ messageId: deleteId, chatId: user?.id }));

            // Notify the other user via WebSocket
            socketService.notifyMessageDeletion(user?.id, deleteId);
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    Alert.alert(
      "Select Image",
      "Choose how you want to select an image",
      [
        {
          text: "Camera",
          onPress: () => openCamera(),
        },
        {
          text: "Gallery",
          onPress: () => openGallery(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const openCamera = async () => {
    // Request camera permission
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (cameraPermission.granted === false) {
      alert('Permission to access camera is required!');
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Allow full image without cropping
      quality: 0.9, // Higher quality
    });

    if (!result.canceled) {
      handleImageResult(result);
    }
  };

  const openGallery = async () => {
    // Request gallery permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    // Pick image from gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Allow full image without cropping
      quality: 0.9, // Higher quality
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      handleImageResult(result);
    }
  };

  const handleImageResult = (result) => {
    // Send image
    dispatch(sendImageMessage({
      receiverId: user?.id,
      imageUri: result.assets[0].uri,
    }));

    // Add local image message for immediate UI feedback
    const localImageMessage = {
      id: Date.now().toString(),
      text: '',
      senderId: currentUser?.id,
      messageType: 'image',
      imageUrl: result.assets[0].uri,
    };

    dispatch(addLocalMessage({
      chatId: user?.id,
      message: localImageMessage,
    }));

    // Scroll to bottom
    setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
  };

  const openImageViewer = (imageUrl, messageData) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageMessage(messageData);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl("");
    setSelectedImageMessage(null);
  };

  const handleDeleteImageFromViewer = () => {
    if (selectedImageMessage) {
      Alert.alert(
        "Delete Image",
        "Are you sure you want to delete this image?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              // Use mongoId if available (for fetched messages), otherwise use id (for local messages)
              const deleteId = selectedImageMessage.mongoId || selectedImageMessage.id;
              dispatch(deleteMessage({
                messageId: deleteId,
                chatId: user?.id
              }));

              // Notify the other user via WebSocket
              socketService.notifyMessageDeletion(user?.id, deleteId);

              closeImageViewer();
            },
          },
        ]
      );
    }
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    const isImageMessage = item.messageType === 'image' || item.imageUrl;

    const MessageContent = () => {
      if (isImageMessage) {
        const imageSource = item.imageUrl?.startsWith('http')
          ? item.imageUrl
          : item.imageUrl?.startsWith('/uploads')
          ? `${process.env.API_BASE_URL || "http://192.168.31.251:8000"}${item.imageUrl}`
          : item.imageUrl;

        return (
          <TouchableOpacity onPress={() => openImageViewer(imageSource, item)}>
            <Image
              source={{ uri: imageSource }}
              style={styles.messageImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      }
      return <Text style={styles.messageText}>{item.text}</Text>;
    };

    if (isCurrentUser) {
      return (
        <TouchableOpacity
          style={[
            !isImageMessage && styles.messageContainer,
            !isImageMessage && styles.userMessage,
            isImageMessage && styles.imageMessageContainer,
            isImageMessage ? { alignSelf: 'flex-end', marginRight: 10 } : { alignSelf: 'flex-end' },
          ]}
          onLongPress={() => handleDeleteMessage(item)}
          delayLongPress={500}
        >
          <MessageContent />
        </TouchableOpacity>
      );
    }

    return (
      <View
        style={[
          !isImageMessage && styles.messageContainer,
          !isImageMessage && styles.botMessage,
          isImageMessage && styles.imageMessageContainer,
          isImageMessage ? { alignSelf: 'flex-start', marginLeft: 10 } : { alignSelf: 'flex-start' },
        ]}
      >
        <MessageContent />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            {userOnlineStatus && (
              <View style={styles.onlineIndicator} />
            )}
          </View>

          <View>
            <Text style={styles.chatHeaderText}>{user?.name || "Chat"}</Text>
            {isTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : userOnlineStatus ? (
              <Text style={styles.onlineText}>online</Text>
            ) : null}
          </View>
        </View>
      </View>

      {fetchingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🔐 Messages are end-to-end encrypted</Text>
          <Text style={styles.emptySubtext}>Start a conversation with {user?.name}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImage}
          disabled={loading}
        >
          <Text style={styles.imageButtonText}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={handleTyping}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={loading}
        >
          <Text style={styles.sendText}>{loading ? "Sending..." : "Send"}</Text>
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <ImageViewer
          imageUrls={[{ url: selectedImageUrl }]}
          index={0}
          onSwipeDown={closeImageViewer}
          onCancel={closeImageViewer}
          enableSwipeDown={true}
          backgroundColor="rgba(0, 0, 0, 0.9)"
          renderHeader={() => (
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeImageViewer}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {selectedImageMessage && selectedImageMessage.senderId === currentUser?.id && (
                <TouchableOpacity
                  style={styles.deleteButtonInViewer}
                  onPress={handleDeleteImageFromViewer}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  chatHeader: {
    backgroundColor: "#007AFF",
    padding: 15,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 25,
    backgroundColor: "#E57373",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff", // text color
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  typingText: {
    fontSize: 12,
    color: "#e0e0e0",
    fontStyle: "italic",
  },
  onlineText: {
    fontSize: 12,
    color: "#e0e0e0",
  },
  chatStatus: {
    fontSize: 14,
    color: "#e0e0e0",
    marginTop: 2,
  },
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    maxWidth: "70%",
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  userMessage: {
    backgroundColor: "#90EE90", // light green
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "#e0e0e0", // light gray
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  imageButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginRight: 10,
  },
  imageButtonText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007AFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  imageMessageContainer: {
    backgroundColor: 'transparent',
    marginVertical: 5,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageImage: {
    width: 220,
    height: 280,
    minWidth: 150,
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Image Viewer Styles
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50,
    position: 'absolute',
    top: 0,
    zIndex: 1000,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  deleteButtonInViewer: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
