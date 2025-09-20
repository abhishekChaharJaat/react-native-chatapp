import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {};
  }

  async connect(serverUrl = 'http://localhost:8000', userId = null) {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      // If userId provided, update the connection
      if (userId) {
        this.emit('user_connected', userId);
      }
      return;
    }

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.isConnected = true;
        this.onConnectHandler(userId);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Set up default event listeners
      this.setupDefaultListeners();

    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }

  async onConnectHandler(userId = null) {
    // When connected, send user ID to server
    let userIdToSend = userId;
    if (!userIdToSend) {
      userIdToSend = await AsyncStorage.getItem('userId');
    }
    if (userIdToSend) {
      console.log('Sending user_connected with ID:', userIdToSend);
      this.emit('user_connected', userIdToSend);
    }
  }

  setupDefaultListeners() {
    // Listen for incoming messages
    this.socket.on('receive_message', (data) => {
      this.notifyListeners('receive_message', data);
    });

    // Listen for message sent confirmation
    this.socket.on('message_sent', (data) => {
      this.notifyListeners('message_sent', data);
    });

    // Listen for user online/offline status
    this.socket.on('user_online', (userId) => {
      this.notifyListeners('user_online', userId);
    });

    this.socket.on('user_offline', (userId) => {
      this.notifyListeners('user_offline', userId);
    });

    // Listen for typing indicators
    this.socket.on('user_typing', (userId) => {
      this.notifyListeners('user_typing', userId);
    });

    this.socket.on('user_stopped_typing', (userId) => {
      this.notifyListeners('user_stopped_typing', userId);
    });

    // Listen for message deletion
    this.socket.on('message_deleted', (data) => {
      this.notifyListeners('message_deleted', data);
    });

    // Listen for online users list
    this.socket.on('online_users_list', (userIds) => {
      this.notifyListeners('online_users_list', userIds);
    });
  }

  // Send message to another user
  sendMessage(recipientId, message, senderId) {
    if (!this.isConnected || !this.socket) {
      console.error('Socket not connected');
      return false;
    }

    this.socket.emit('send_message', {
      recipientId,
      message,
      senderId,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Notify about message deletion
  notifyMessageDeletion(recipientId, messageId) {
    if (!this.isConnected || !this.socket) {
      console.error('Socket not connected');
      return false;
    }

    this.socket.emit('delete_message', {
      recipientId,
      messageId
    });
    return true;
  }

  // Typing indicators
  startTyping(recipientId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('typing_start', recipientId);
    }
  }

  stopTyping(recipientId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('typing_stop', recipientId);
    }
  }

  // Generic emit method
  emit(event, data) {
    if (!this.isConnected || !this.socket) {
      console.error('Socket not connected');
      return false;
    }
    this.socket.emit(event, data);
    return true;
  }

  // Listen to events
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Register a listener for component-level handling
  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove a component-level listener
  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Notify all registered listeners for an event
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners = {};
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;