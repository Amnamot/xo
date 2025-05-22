import React, { createContext, useContext, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://igra.top';
const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        path: '/socket.io/',
        withCredentials: true,
      });
    }
    // Можно добавить обработку событий, переподключение и т.д.

    return () => {
      // Отключение сокета при размонтировании приложения (если нужно)
      // socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext); 