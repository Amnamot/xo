import { io } from 'socket.io-client';

const SOCKET_URL = 'https://igra.top';

let socket = null;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

export const initSocket = () => {
  if (socket) return socket;
  
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
  if (!telegramId) {
    console.error('❌ Critical: Telegram WebApp not initialized when it should be');
    return null;
  }

  console.log('🔌 Creating new socket connection', {
    telegramId,
    timestamp: new Date().toISOString()
  });

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
    withCredentials: true,
    query: { telegramId }
  });

  // Обработка ошибок
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
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
  });

  return socket;
};

// Функция для подписки на события игры
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

  if (onGameStart) currentSocket.on('gameStart', onGameStart);
  if (onOpponentJoined) currentSocket.on('opponentJoined', onOpponentJoined);
  if (onMoveMade) currentSocket.on('moveMade', onMoveMade);
  if (onTimeUpdated) currentSocket.on('timeUpdated', onTimeUpdated);
  if (onViewportUpdated) currentSocket.on('viewportUpdated', onViewportUpdated);
  if (onPlayerStatus) currentSocket.on('playerStatus', onPlayerStatus);
  if (onPlayerDisconnected) currentSocket.on('playerDisconnected', onPlayerDisconnected);
  if (onPlayerReconnected) currentSocket.on('playerReconnected', onPlayerReconnected);
  if (onGameEnded) currentSocket.on('gameEnded', onGameEnded);

  return () => {
    if (!currentSocket) return;
    
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
  const currentSocket = initSocket();
  if (!currentSocket) {
    return Promise.reject(new Error('Failed to initialize socket'));
  }

  return new Promise((resolve, reject) => {
    if (currentSocket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      currentSocket.off('connect', handleConnect);
    };

    currentSocket.once('connect', handleConnect);
    reconnectAttempts = 0;
    currentSocket.connect();
  });
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  reconnectAttempts = 0;
};

// Функции для игровых событий
export const createLobby = (telegramId) => {
  const currentSocket = initSocket();
  return new Promise((resolve, reject) => {
    if (!currentSocket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }
    currentSocket.emit('createLobby', { telegramId }, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

export const joinLobby = (lobbyId, telegramId) => {
  const currentSocket = initSocket();
  return new Promise((resolve, reject) => {
    if (!currentSocket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }
    
    let gameStartHandler;
    let joinResponseHandler;
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (gameStartHandler) {
        currentSocket.off('gameStart', gameStartHandler);
      }
    };

    // Устанавливаем таймаут
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Join lobby timeout'));
    }, 10000);

    // Обработчик начала игры
    gameStartHandler = (data) => {
      cleanup();
      console.log('✅ Game started:', {
        data,
        timestamp: new Date().toISOString()
      });
      resolve(data);
    };

    // Подписываемся на событие начала игры
    currentSocket.once('gameStart', gameStartHandler);

    // Отправляем запрос на присоединение к лобби
    currentSocket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
      if (response?.status === 'error') {
        cleanup();
        reject(response);
      }
      // Не резолвим промис здесь, ждем gameStart
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

export const createInviteWS = (telegramId) => {
  const currentSocket = initSocket();
  return new Promise((resolve, reject) => {
    if (!currentSocket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }
    currentSocket.emit('createInvite', { telegramId }, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}; 