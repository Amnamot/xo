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

export const initSocket = () => {
  try {
    console.log('🔍 [Socket Service] Initializing socket...', {
      existingSocket: socket ? 'exists' : 'null',
      existingSocketId: socket?.id,
      existingSocketConnected: socket?.connected,
      existingRooms: socket ? Array.from(socket.rooms || []) : [],
      timestamp: new Date().toISOString()
    });

    // Если сокет существует и подключен, возвращаем его
    if (socket && socket.connected) {
      console.log('♻️ [Socket Service] Reusing existing socket:', {
        socketId: socket.id,
        connected: socket.connected,
        readyState: socket.connected ? 'connected' : 'disconnected',
        rooms: Array.from(socket.rooms || []),
        timestamp: new Date().toISOString()
      });
      return socket;
    }

    // Если сокет существует, но отключен, пробуем переподключиться
    if (socket && !socket.connected) {
      console.log('🔄 [Socket Service] Reconnecting existing socket:', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      socket.connect();
      return socket;
    }
  
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('current_telegram_id');
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

    if (!telegramId) {
      console.error('❌ [Socket Service] Telegram ID not found in WebApp or localStorage');
      throw new Error('Telegram user ID not found');
    }

    console.log('🔄 [Socket Service] Creating new socket...', {
      telegramId,
      startParam,
      timestamp: new Date().toISOString()
    });

    // Проверяем URL
    console.log('🌐 [Socket Service] Using URL:', SOCKET_URL);

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY * 5,
      timeout: CONNECTION_TIMEOUT,
      forceNew: false, // Изменено с true на false для переиспользования подключения
      withCredentials: true,
      query: { 
        telegramId,
        start_param: startParam 
      }
    });

    // Проверяем создание сокета
    if (!socket) {
      throw new Error('Failed to create socket instance');
    }

    console.log('✅ [Socket Service] Socket instance created:', {
      socketId: socket.id,
      connected: socket.connected,
      readyState: socket.connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });

    // Обработка ошибок
    socket.on('connect_error', (error) => {
      console.error('❌ [Socket Service] Connection error:', {
        error: error.message,
        online: checkNetworkConnection(),
        attempts: reconnectAttempts,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('connect', () => {
      console.log('🌟 [Socket Service] Connected:', {
        socketId: socket.id,
        rooms: Array.from(socket.rooms || []),
        timestamp: new Date().toISOString()
      });
      reconnectAttempts = 0;
      
      // Проверяем комнаты после подключения
      console.log('🔍 [Socket Service] Rooms after connect:', {
        socketId: socket.id,
        rooms: Array.from(socket.rooms || []),
        timestamp: new Date().toISOString()
      });

      // Обновляем telegramId в localStorage при успешном подключении
      if (telegramId) {
        localStorage.setItem('current_telegram_id', telegramId);
        console.log('💾 [Socket Service] Updated telegramId in localStorage:', telegramId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ [Socket Service] Disconnected:', {
        reason,
        online: checkNetworkConnection(),
        timestamp: new Date().toISOString()
      });
      
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        return;
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && checkNetworkConnection()) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log('🔄 [Socket Service] Reconnecting:', {
            attempt: reconnectAttempts,
            maxAttempts: MAX_RECONNECT_ATTEMPTS,
            timestamp: new Date().toISOString()
          });
          socket.connect();
        }, RECONNECTION_DELAY * reconnectAttempts);
      } else {
        console.error('❌ [Socket Service] Max reconnection attempts reached:', {
          attempts: reconnectAttempts,
          online: checkNetworkConnection(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Добавляем слушатель для отслеживания изменений в комнатах
    socket.on('room', (roomData) => {
      console.log('🏠 [Socket Service] Room event:', {
        socketId: socket.id,
        roomData,
        currentRooms: Array.from(socket.rooms || []),
        timestamp: new Date().toISOString()
      });
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

    const socket = initSocket();
    
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

export const joinLobby = (lobbyId, telegramId) => {
  const currentSocket = initSocket();
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

export const updatePlayerTime = (gameId, playerTimes) => {
  const currentSocket = initSocket();
  if (currentSocket.connected) {
    currentSocket.emit('updatePlayerTime', { gameId, playerTimes });
  }
};

export const makeMove = (gameId, position, player, moveTime) => {
  const currentSocket = initSocket();
  return new Promise((resolve) => {
    currentSocket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updateViewport = (gameId, viewport) => {
  const currentSocket = initSocket();
  currentSocket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = (gameId, moveId) => {
  const currentSocket = initSocket();
  currentSocket.emit('moveReceived', { gameId, moveId });
};

export const createInviteWS = async (telegramId) => {
  try {
    console.log('📨 [Socket Service] Creating invite:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    const socket = initSocket();
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
export const subscribeToGameEvents = (handlers) => {
  const currentSocket = initSocket();
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
export const connectSocket = () => {
  console.log('🔄 [Socket Connect] Starting connection process...');
  
  const currentSocket = initSocket();
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

    const socket = initSocket();
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