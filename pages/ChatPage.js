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
} from "../store/messagesSlice";

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
  const flatListRef = useRef();

  // Get messages for this user from Redux store
  const messages = messagesList[user?.id] || [];

  // Fetch messages when component mounts
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchMessages(user.id));
    }
  }, [dispatch, user?.id]);

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

    // Scroll to bottom after sending
    setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);

    // Dispatch Redux action to send message to API
    dispatch(
      sendMessage({
        receiverId: user?.id || "default-receiver",
        message: currentMessage,
      })
    );
  };

  const handleDeleteMessage = (messageId) => {
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
            dispatch(deleteMessage({ messageId, chatId: user?.id }));
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
              dispatch(deleteMessage({
                messageId: selectedImageMessage.id,
                chatId: user?.id
              }));
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
          onLongPress={() => handleDeleteMessage(item.id)}
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
          </View>

          <Text style={styles.chatHeaderText}>{user?.name || "Chat"}</Text>
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
          onChangeText={setInputText}
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
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff", // text color
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
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
