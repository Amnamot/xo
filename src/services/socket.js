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
  if (socket) return socket;
  
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
  if (!telegramId) {
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
    query: { telegramId }
  });

  // Обработка ошибок
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', {
      error: error.message,
      online: checkNetworkConnection(),
      attempts: reconnectAttempts,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket server', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', {
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
        console.log('Attempting to reconnect:', {
          attempt: reconnectAttempts,
          maxAttempts: MAX_RECONNECT_ATTEMPTS,
          timestamp: new Date().toISOString()
        });
        socket.connect();
      }, RECONNECTION_DELAY * reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached or no network connection', {
        attempts: reconnectAttempts,
        online: checkNetworkConnection(),
        timestamp: new Date().toISOString()
      });
    }
  });

  return socket;
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
  const currentSocket = initSocket();
  return new Promise((resolve, reject) => {
    if (currentSocket.connected) {
      resolve();
      return;
    }

    if (!checkNetworkConnection()) {
      reject(new Error('No network connection'));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('WebSocket connection timeout'));
    }, CONNECTION_TIMEOUT);

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      currentSocket.off('connect', handleConnect);
      currentSocket.off('connect_error', handleError);
    };

    currentSocket.once('connect', handleConnect);
    currentSocket.once('connect_error', handleError);

    try {
      currentSocket.connect();
    } catch (error) {
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