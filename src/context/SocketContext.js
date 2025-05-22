import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://igra.top';
const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  // Получаем telegramId один раз при инициализации
  const telegramId =
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ||
    localStorage.getItem('current_telegram_id') ||
    null;

  useEffect(() => {
    if (!telegramId) return;

    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      withCredentials: true,
      query: { telegramId }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [telegramId]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext); 