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
    throw new Error('Telegram user ID not found');
  }

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
    console.error('WebSocket connection error:', error);
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', reason);
    
    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      return;
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        socket.connect();
      }, 1000 * reconnectAttempts);
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
    
    // Устанавливаем слушатель для события начала игры
    currentSocket.once('gameStart', (data) => {
      console.log('✅ Game started:', data);
      resolve(data);
    });

    // Отправляем запрос на присоединение к лобби
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