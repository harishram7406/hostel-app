import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
// If using prop-types for type checking:
// import PropTypes from 'prop-types';

// Adjust the import based on where you store auth info (e.g., another context, zustand, localStorage)
// import { useAuth } from './AuthContext'; // Example: Assuming an AuthContext exists

const SocketContext = createContext(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) { // Check for undefined explicitly
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Get the server URL from environment variables or default
// Use process.env for Create React App compatibility
const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // TODO: Replace this with actual user info retrieval
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const userId = userInfo?._id;

  useEffect(() => {
    let newSocket = null;

    if (userId) {
      console.log('Attempting to connect socket...');
      newSocket = io(SOCKET_SERVER_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket?.id);
        setIsConnected(true);
        newSocket?.emit('storeUserId', userId);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // --- Add listeners for custom events here ---
      // Example:
      // newSocket.on('newMessage', (message) => {
      //   console.log('New message received:', message);
      // });
      // newSocket.on('newNotification', (notification) => {
      //  console.log('New notification:', notification);
      // });
      // ---------------------------------------------
    }

    return () => {
      if (newSocket) {
        console.log('Disconnecting socket...');
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [userId]);

  const contextValue = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Optional: Add prop-types if needed
// SocketProvider.propTypes = {
//   children: PropTypes.node.isRequired,
// }; 