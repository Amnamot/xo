// src/services/socket.js 
// v1
import { io } from 'socket.io-client';

let socket = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Объявляем все обработчики событий до их использования
const handleConnect = (socket) => {
  console.log('✅ Connected to WebSocket server', {
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
  reconnectAttempts = 0;
};

const handleConnectError = (error) => {
  console.error('❌ WebSocket connection error:', {
    error: error.message,
    timestamp: new Date().toISOString()
  });
};

const handleDisconnect = (socket, reason) => {
  console.log('🔌 Disconnected from WebSocket server:', {
    reason,
    timestamp: new Date().toISOString()
  });
  
  if (reason === 'io server disconnect' || reason === 'io client disconnect') {
    return;
  }

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      socket.connect();
    }, 1000 * reconnectAttempts);
  }
};

// Инициализация сокета
export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      query: {
        telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()
      }
    });

    // Добавляем базовые обработчики событий
    socket.on('connect', () => {
      console.log('✅ Socket connected:', {
        id: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', {
        timestamp: new Date().toISOString()
      });
    });
  }
  return socket;
};

// Функция для получения текущего инстанса сокета
export const getSocket = () => socket;

// Функция для проверки состояния подключения
export const isSocketConnected = () => {
  return socket?.connected || false;
};

// Функция для переподключения сокета
export const reconnectSocket = () => {
  if (socket) {
    socket.connect();
  } else {
    initSocket();
  }
};

// Функция для отключения сокета
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;
};

// Объявляем обработчики событий для joinLobby
const createGameStartHandler = (cleanup, resolve) => (data) => {
  cleanup();
  console.log('✅ Game started:', {
    data,
    timestamp: new Date().toISOString()
  });
  resolve(data);
};

export const joinLobby = (lobbyId, telegramId) => {
  const currentSocket = initSocket();
  
  if (!currentSocket?.connected) {
    return Promise.reject(new Error('WebSocket is not connected'));
  }

  return new Promise((resolve, reject) => {
    let gameStartHandler;
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (gameStartHandler) {
        currentSocket.off('gameStart', gameStartHandler);
      }
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Join lobby timeout'));
    }, 10000);

    gameStartHandler = createGameStartHandler(cleanup, resolve);
    currentSocket.once('gameStart', gameStartHandler);

    currentSocket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
      if (response?.status === 'error') {
        cleanup();
        reject(response);
      }
    });
  });
};

export const subscribeToGameEvents = (handlers) => {
  const currentSocket = initSocket();
  
  if (!currentSocket) {
    console.error('❌ Failed to initialize socket for event subscription');
    return () => {};
  }

  const {
    onGameStart,
    onOpponentJoined,
    onMoveMade,
    onTimeUpdated,
    onViewportUpdated,
    onPlayerStatus,
    onPlayerDisconnected,
    onPlayerReconnected,
    onGameEnded
  } = handlers;

  const eventHandlers = {
    gameStart: onGameStart,
    opponentJoined: onOpponentJoined,
    moveMade: onMoveMade,
    timeUpdated: onTimeUpdated,
    viewportUpdated: onViewportUpdated,
    playerStatus: onPlayerStatus,
    playerDisconnected: onPlayerDisconnected,
    playerReconnected: onPlayerReconnected,
    gameEnded: onGameEnded
  };

  // Подписываемся на события
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    if (handler) {
      currentSocket.on(event, handler);
    }
  });

  // Возвращаем функцию отписки
  return () => {
    if (!currentSocket) return;
    
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      if (handler) {
        currentSocket.off(event, handler);
      }
    });
  };
};

export const makeMove = (gameId, position, player, moveTime) => {
  const currentSocket = initSocket();
  
  if (!currentSocket?.connected) {
    return Promise.reject(new Error('WebSocket is not connected'));
  }

  return new Promise((resolve) => {
    currentSocket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updatePlayerTime = (gameId, playerTimes) => {
  const currentSocket = initSocket();
  if (currentSocket?.connected) {
    currentSocket.emit('updatePlayerTime', { gameId, playerTimes });
  }
};

export const updateViewport = (gameId, viewport) => {
  const currentSocket = initSocket();
  if (currentSocket?.connected) {
    currentSocket.emit('updateViewport', { gameId, viewport });
  }
};

export const confirmMoveReceived = (gameId, moveId) => {
  const currentSocket = initSocket();
  if (currentSocket?.connected) {
    currentSocket.emit('moveReceived', { gameId, moveId });
  }
};

export const createLobby = (telegramId) => {
  const currentSocket = initSocket();
  
  if (!currentSocket?.connected) {
    return Promise.reject(new Error('WebSocket is not connected'));
  }

  return new Promise((resolve, reject) => {
    currentSocket.emit('createLobby', { telegramId }, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

export const createInviteWS = (telegramId) => {
  const currentSocket = initSocket();
  
  if (!currentSocket?.connected) {
    return Promise.reject(new Error('WebSocket is not connected'));
  }

  return new Promise((resolve, reject) => {
    currentSocket.emit('createInvite', { telegramId }, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

// Функции-хелперы для работы с сокетами
export const connectSocket = async () => {
  const socket = io(process.env.REACT_APP_SOCKET_URL, {
    transports: ['websocket'],
    query: {
      telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()
    }
  });
  
  socketInstance = socket;
  return socket;
}; 