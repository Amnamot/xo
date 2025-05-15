// src/services/socket.js 
// v2
import { io } from 'socket.io-client';

let socket = null;
let socketInstance = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
let connectionPromise = null;
let isInitializing = false;

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

// Функция для ожидания подключения сокета
const waitForConnection = (socket, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve(socket);
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Socket connection timeout'));
    }, timeout);

    const connectHandler = () => {
      cleanup();
      resolve(socket);
    };

    const errorHandler = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off('connect', connectHandler);
      socket.off('connect_error', errorHandler);
    };

    socket.once('connect', connectHandler);
    socket.once('connect_error', errorHandler);
  });
};

// Инициализация сокета с гарантированным подключением
export const initSocket = async () => {
  if (isInitializing) {
    console.log('🔄 Socket initialization already in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return initSocket();
  }

  if (socket?.connected) {
    return socket;
  }

  try {
    isInitializing = true;

    if (!socket) {
      socket = io(process.env.REACT_APP_SOCKET_URL, {
        transports: ['websocket', 'polling'],
        query: {
          telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()
        }
      });

      // Добавляем базовые обработчики событий
      socket.on('connect', () => handleConnect(socket));
      socket.on('connect_error', handleConnectError);
      socket.on('disconnect', (reason) => handleDisconnect(socket, reason));
      
      socketInstance = socket; // Синхронизируем socketInstance с socket
    }

    // Ждем подключения
    await waitForConnection(socket);
    console.log('✅ Socket successfully initialized and connected');
    
    return socket;
  } catch (error) {
    console.error('❌ Failed to initialize socket:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
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
    socketInstance = null; // Очищаем обе ссылки
    connectionPromise = null;
  }
  reconnectAttempts = 0;
};

// Функция для подключения сокета с Promise
export const connectSocket = async () => {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      transports: ['websocket'],
      query: {
        telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()
      }
    });

    const timeoutId = setTimeout(() => {
      if (!newSocket.connected) {
        newSocket.close();
        reject(new Error('Socket connection timeout'));
        connectionPromise = null;
      }
    }, 5000);

    newSocket.on('connect', () => {
      clearTimeout(timeoutId);
      socket = newSocket;
      socketInstance = newSocket;
      resolve(newSocket);
    });

    newSocket.on('connect_error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
      connectionPromise = null;
    });
  });

  return connectionPromise;
};

// Вспомогательная функция для проверки и ожидания подключения
const ensureConnection = async () => {
  if (socket?.connected) {
    return socket;
  }

  try {
    return await connectSocket();
  } catch (error) {
    console.error('Failed to connect socket:', error);
    throw error;
  }
};

// Обновляем все методы для использования ensureConnection
export const createLobby = async (telegramId) => {
  console.log('🎮 Creating lobby for:', {
    telegramId,
    timestamp: new Date().toISOString()
  });

  try {
    const currentSocket = await initSocket();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Create lobby timeout'));
      }, 10000);

      currentSocket.emit('createLobby', { telegramId }, (response) => {
        clearTimeout(timeoutId);
        
        if (response?.error) {
          console.error('❌ Failed to create lobby:', {
            error: response.error,
            telegramId,
            timestamp: new Date().toISOString()
          });
          reject(new Error(response.error));
        } else {
          console.log('✅ Lobby created successfully:', {
            response,
            telegramId,
            timestamp: new Date().toISOString()
          });
          resolve(response);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error in createLobby:', {
      error: error.message,
      telegramId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const joinLobby = async (lobbyId, telegramId) => {
  const currentSocket = await ensureConnection();

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

    gameStartHandler = (data) => {
      cleanup();
      resolve(data);
    };
    
    currentSocket.once('gameStart', gameStartHandler);

    currentSocket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
      if (response?.status === 'error') {
        cleanup();
        reject(response);
      }
    });
  });
};

export const makeMove = async (gameId, position, player, moveTime) => {
  const currentSocket = await ensureConnection();

  return new Promise((resolve) => {
    currentSocket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updatePlayerTime = async (gameId, playerTimes) => {
  const currentSocket = await ensureConnection();
  currentSocket.emit('updatePlayerTime', { gameId, playerTimes });
};

export const updateViewport = async (gameId, viewport) => {
  const currentSocket = await ensureConnection();
  currentSocket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = async (gameId, moveId) => {
  const currentSocket = await ensureConnection();
  currentSocket.emit('moveReceived', { gameId, moveId });
};

export const createInviteWS = async (telegramId) => {
  const currentSocket = await ensureConnection();

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