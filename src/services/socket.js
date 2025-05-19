import { io } from 'socket.io-client';

const SOCKET_URL = 'https://igra.top';
const CONNECTION_TIMEOUT = 10000; // Увеличиваем таймаут до 10 секунд
const RECONNECTION_DELAY = 2000;

let socket = null;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Проверка состояния сети
const checkNetworkConnection = () => {
  return navigator.onLine;
};

export const initSocket = async () => {
  try {
    console.log('🔍 [Socket Service] Initializing socket...', {
      existingSocket: socket ? 'exists' : 'null',
      existingSocketId: socket?.id,
      existingSocketConnected: socket?.connected,
      timestamp: new Date().toISOString()
    });

    // Если сокет существует и подключен, возвращаем его
    if (socket && socket.connected) {
      console.log('♻️ [Socket Service] Reusing existing socket:', {
        socketId: socket.id,
        connected: socket.connected,
        timestamp: new Date().toISOString()
      });
      return socket;
    }

    // Если сокет существует, но отключен, отключаем его перед созданием нового
    if (socket && !socket.connected) {
      console.log('🔄 [Socket Service] Disconnecting existing socket before reconnecting:', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      socket.disconnect();
      socket = null;
    }
  
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('current_telegram_id');
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

    if (!telegramId) {
      console.error('❌ [Socket Service] Telegram ID not found in WebApp or localStorage');
      throw new Error('Telegram user ID not found');
    }

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY * 5,
      timeout: CONNECTION_TIMEOUT,
      forceNew: true,
      withCredentials: true,
      query: { 
        telegramId,
        start_param: startParam 
      }
    });

    // Ждем подключения сокета
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('connect_error', handleError);
        }
        reject(new Error('Socket connection timeout'));
      }, CONNECTION_TIMEOUT);

      const handleConnect = () => {
        clearTimeout(timeout);
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('connect_error', handleError);
        }
        resolve();
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('connect_error', handleError);
        }
        reject(error);
      };

      if (socket) {
        socket.on('connect', handleConnect);
        socket.on('connect_error', handleError);
        socket.connect();
      } else {
        clearTimeout(timeout);
        reject(new Error('Failed to create socket instance'));
      }
    });

    // Добавляем базовые обработчики событий
    socket.on('connect', () => {
      console.log('✅ [Socket Service] Connected:', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket Service] Disconnected:', {
        reason,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket Service] Connection error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ [Socket Service] Socket initialized and connected:', {
      socketId: socket.id,
      connected: socket.connected,
      timestamp: new Date().toISOString()
    });

    return socket;
  } catch (error) {
    console.error('❌ [Socket Service] Failed to initialize socket:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Функции для игровых событий
export const createLobby = async (telegramId) => {
  try {
    console.log('🎮 [Socket Service] Creating lobby:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    const socket = await initSocket();
    
    console.log('🔍 [Socket Service] Socket state before lobby creation:', {
      socketId: socket.id,
      connected: socket.connected,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    const response = await new Promise((resolve) => {
      socket.emit('createLobby', { telegramId }, (response) => {
        console.log('✅ [Socket Service] Lobby creation result:', {
          response,
          socketId: socket.id,
          connected: socket.connected,
          rooms: Array.from(socket.rooms || []),
          telegramId,
          timestamp: new Date().toISOString()
        });
        resolve(response);
      });
    });

    return response;
  } catch (error) {
    console.error('❌ [Socket Service] Failed to create lobby:', {
      error: error.message,
      telegramId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const joinLobby = async (lobbyId, telegramId) => {
  const currentSocket = await initSocket();
  return new Promise((resolve, reject) => {
    if (!currentSocket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }

    currentSocket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
      if (response?.status === 'error') {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });
};

export const updatePlayerTime = async (gameId, playerTimes) => {
  const currentSocket = await initSocket();
  if (currentSocket.connected) {
    currentSocket.emit('updatePlayerTime', { gameId, playerTimes });
  }
};

export const makeMove = async (gameId, position, player, moveTime) => {
  const currentSocket = await initSocket();
  return new Promise((resolve) => {
    currentSocket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updateViewport = async (gameId, viewport) => {
  const currentSocket = await initSocket();
  currentSocket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = async (gameId, moveId) => {
  const currentSocket = await initSocket();
  currentSocket.emit('moveReceived', { gameId, moveId });
};

export const createInviteWS = async (telegramId) => {
  try {
    console.log('📨 [Socket Service] Creating invite:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    const socket = await initSocket();
    const response = await new Promise((resolve) => {
      socket.emit('createInvite', { telegramId }, (response) => {
        console.log('✅ [Socket Service] Invite creation result:', {
          response,
          telegramId,
          timestamp: new Date().toISOString()
        });
        resolve(response);
      });
    });

    return response;
  } catch (error) {
    console.error('❌ [Socket Service] Failed to create invite:', {
      error: error.message,
      telegramId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Функция для подписки на события игры
export const subscribeToGameEvents = async (handlers) => {
  const currentSocket = await initSocket();
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

  if (onGameStart) currentSocket.on('gameStart', onGameStart);
  if (onOpponentJoined) currentSocket.on('opponentJoined', onOpponentJoined);
  if (onMoveMade) currentSocket.on('moveMade', onMoveMade);
  if (onTimeUpdated) currentSocket.on('timeUpdated', onTimeUpdated);
  if (onViewportUpdated) currentSocket.on('viewportUpdated', onViewportUpdated);
  if (onPlayerStatus) currentSocket.on('playerStatus', onPlayerStatus);
  if (onPlayerDisconnected) currentSocket.on('playerDisconnected', onPlayerDisconnected);
  if (onPlayerReconnected) currentSocket.on('playerReconnected', onPlayerReconnected);
  if (onGameEnded) currentSocket.on('gameEnded', onGameEnded);

  // Возвращаем функцию для отписки от событий
  return () => {
    currentSocket.off('gameStart', onGameStart);
    currentSocket.off('opponentJoined', onOpponentJoined);
    currentSocket.off('moveMade', onMoveMade);
    currentSocket.off('timeUpdated', onTimeUpdated);
    currentSocket.off('viewportUpdated', onViewportUpdated);
    currentSocket.off('playerStatus', onPlayerStatus);
    currentSocket.off('playerDisconnected', onPlayerDisconnected);
    currentSocket.off('playerReconnected', onPlayerReconnected);
    currentSocket.off('gameEnded', onGameEnded);
  };
};

// Функции-хелперы для работы с сокетами
export const connectSocket = async () => {
  console.log('🔄 [Socket Connect] Starting connection process...');
  
  const currentSocket = await initSocket();
  console.log('📡 [Socket Connect] Got socket instance:', {
    socketId: currentSocket.id,
    connected: currentSocket.connected,
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    if (currentSocket.connected) {
      console.log('✅ [Socket Connect] Already connected');
      resolve();
      return;
    }

    if (!checkNetworkConnection()) {
      console.error('❌ [Socket Connect] No network connection');
      reject(new Error('No network connection'));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      console.error('⏰ [Socket Connect] Connection timeout');
      reject(new Error('WebSocket connection timeout'));
    }, CONNECTION_TIMEOUT);

    const handleConnect = () => {
      console.log('🌟 [Socket Connect] Connection successful:', {
        socketId: currentSocket.id,
        timestamp: new Date().toISOString()
      });
      cleanup();
      resolve();
    };

    const handleError = (error) => {
      console.error('❌ [Socket Connect] Connection error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      console.log('🧹 [Socket Connect] Cleaning up listeners');
      clearTimeout(timeout);
      currentSocket.off('connect', handleConnect);
      currentSocket.off('connect_error', handleError);
    };

    currentSocket.once('connect', handleConnect);
    currentSocket.once('connect_error', handleError);

    try {
      console.log('📡 [Socket Connect] Initiating connection...');
      currentSocket.connect();
    } catch (error) {
      console.error('💥 [Socket Connect] Failed to initiate connection:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      cleanup();
      reject(error);
    }
  });
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  reconnectAttempts = 0;
};

export const checkAndRestoreGameState = async (telegramId) => {
  try {
    console.log('🔍 [Socket Service] Checking game state:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    const socket = await initSocket();
    const response = await new Promise((resolve) => {
      socket.emit('checkActiveLobby', { telegramId }, (response) => {
        console.log('📊 [Socket Service] Game state check result:', {
          response,
          telegramId,
          timestamp: new Date().toISOString()
        });
        resolve(response);
      });
    });

    return response;
  } catch (error) {
    console.error('❌ [Socket Service] Failed to check game state:', {
      error: error.message,
      telegramId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const sendPlayerInfo = async (gameId, playerInfo) => {
  const currentSocket = await initSocket();
  if (currentSocket.connected) {
    console.log('👤 [Socket Service] Sending player info:', {
      gameId,
      playerInfo,
      timestamp: new Date().toISOString()
    });
    currentSocket.emit('playerInfo', { gameId, playerInfo });
  }
}; 