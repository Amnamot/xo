import React, { createContext, useContext } from 'react';
import { io } from 'socket.io-client';

// Создаем экземпляр сокета
const socket = io(process.env.REACT_APP_SOCKET_URL || 'https://api.igra.top', {
  transports: ['websocket'],
  autoConnect: true
});

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
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}; 