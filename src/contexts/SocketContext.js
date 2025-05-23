import React, { createContext, useContext } from 'react';
import { io } from 'socket.io-client';

// Создаем контекст
export const SocketContext = createContext();

// Создаем хук для использования сокета
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};

// Создаем провайдер
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = React.useState(null);

  // Функция инициализации сокета
  const initSocket = (telegramId) => {
    if (!telegramId) {
      console.error('❌ [SocketContext] Cannot initialize socket without telegramId');
      return;
    }

    console.log('🔌 [SocketContext] Initializing socket with telegramId:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'https://api.igra.top', {
      transports: ['websocket'],
      autoConnect: false,
      query: { telegramId }
    });

    newSocket.connect();

    newSocket.on('connect', () => {
      console.log('✅ [SocketContext] Socket connected:', {
        telegramId,
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [SocketContext] Socket connection error:', {
        error: error.message,
        telegramId,
        timestamp: new Date().toISOString()
      });
    });

    setSocket(newSocket);
  };

  return (
    <SocketContext.Provider value={{ socket, initSocket }}>
      {children}
    </SocketContext.Provider>
  );
}; 