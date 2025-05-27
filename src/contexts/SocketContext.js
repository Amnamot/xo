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
  return context;
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

    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'https://api.igra.top/socket.io/', {
      transports: ['websocket'],
      query: { 
        initData: window.Telegram?.WebApp?.initData
      }
    });

    newSocket.on('connect', () => {
      console.log('✅ [SocketContext] Socket connected:', {
        telegramId,
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });

      // Запрашиваем восстановление состояния
      const lastKnownState = localStorage.getItem('lastKnownState');
      const lastActionTimestamp = localStorage.getItem('lastActionTimestamp');

      newSocket.emit('restoreState', {
        telegramId,
        lastKnownState,
        lastActionTimestamp: lastActionTimestamp ? parseInt(lastActionTimestamp) : undefined
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [SocketContext] Socket connection error:', {
        error: error.message,
        telegramId,
        timestamp: new Date().toISOString()
      });
    });

    // Добавляем обработчик gameState
    newSocket.on('gameState', (gameState) => {
      console.log('📊 [SocketContext] Game state received:', {
        gameState,
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Обработчик восстановления состояния
    newSocket.on('restoreState', (data) => {
      console.log('🔄 [SocketContext] State restored:', {
        status: data.status,
        state: data.state,
        timestamp: new Date().toISOString()
      });

      if (data.status === 'success') {
        // Сохраняем текущее состояние
        localStorage.setItem('lastKnownState', data.state);
        localStorage.setItem('lastActionTimestamp', Date.now().toString());

        // Обрабатываем различные состояния
        switch (data.state) {
          case 'game':
            // Восстанавливаем состояние игры
            if (data.gameData) {
              // Здесь можно добавить логику восстановления UI игры
              console.log('🎮 [SocketContext] Game state restored:', data.gameData);
            }
            break;

          case 'lobby':
            // Восстанавливаем состояние лобби
            if (data.lobbyData) {
              // Здесь можно добавить логику восстановления UI лобби
              console.log('🎯 [SocketContext] Lobby state restored:', data.lobbyData);
            }
            break;

          case 'idle':
            // Базовое состояние
            console.log('👤 [SocketContext] Basic state restored:', data.playerData);
            break;
        }
      }
    });

    setSocket(newSocket);
  };

  return (
    <SocketContext.Provider value={{ socket, initSocket }}>
      {children}
    </SocketContext.Provider>
  );
}; 