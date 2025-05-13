import { io } from 'socket.io-client';

const SOCKET_URL = 'https://igra.top';

let socket;
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

  return socket;
};

// Обработка ошибок
socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  window.dispatchEvent(new CustomEvent('websocket_error', { 
    detail: { error: error.message } 
  }));
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  reconnectAttempts = 0;
  window.dispatchEvent(new CustomEvent('websocket_connected'));
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from WebSocket server:', reason);
  
  window.dispatchEvent(new CustomEvent('websocket_disconnected', { 
    detail: { reason } 
  }));

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

// Функции для игровых событий
export const createLobby = (telegramId) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }
    socket.emit('createLobby', { telegramId }, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

export const joinLobby = (lobbyId, telegramId) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }
    socket.emit('joinLobby', { lobbyId, telegramId }, resolve);
  });
};

export const updatePlayerTime = (gameId, playerTimes) => {
  if (socket.connected) {
    socket.emit('updatePlayerTime', { gameId, playerTimes });
  }
};

export const makeMove = (gameId, position, player, moveTime) => {
  return new Promise((resolve) => {
    socket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updateViewport = (gameId, viewport) => {
  socket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = (gameId, moveId) => {
  socket.emit('moveReceived', { gameId, moveId });
};

// Функция для подписки на события игры
export const subscribeToGameEvents = (handlers) => {
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

  if (onGameStart) socket.on('gameStart', onGameStart);
  if (onOpponentJoined) socket.on('opponentJoined', onOpponentJoined);
  if (onMoveMade) socket.on('moveMade', onMoveMade);
  if (onTimeUpdated) socket.on('timeUpdated', onTimeUpdated);
  if (onViewportUpdated) socket.on('viewportUpdated', onViewportUpdated);
  if (onPlayerStatus) socket.on('playerStatus', onPlayerStatus);
  if (onPlayerDisconnected) socket.on('playerDisconnected', onPlayerDisconnected);
  if (onPlayerReconnected) socket.on('playerReconnected', onPlayerReconnected);
  if (onGameEnded) socket.on('gameEnded', onGameEnded);

  // Возвращаем функцию для отписки от событий
  return () => {
    socket.off('gameStart', onGameStart);
    socket.off('opponentJoined', onOpponentJoined);
    socket.off('moveMade', onMoveMade);
    socket.off('timeUpdated', onTimeUpdated);
    socket.off('viewportUpdated', onViewportUpdated);
    socket.off('playerStatus', onPlayerStatus);
    socket.off('playerDisconnected', onPlayerDisconnected);
    socket.off('playerReconnected', onPlayerReconnected);
    socket.off('gameEnded', onGameEnded);
  };
};

// Функции-хелперы для работы с сокетами
export const connectSocket = () => {
  if (!socket) {
    socket = initSocket();
  }
  return new Promise((resolve, reject) => {
    if (socket.connected) {
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

    const handleError = (event) => {
      cleanup();
      reject(new Error(event.detail.error));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('websocket_connected', handleConnect);
      window.removeEventListener('websocket_error', handleError);
    };

    window.addEventListener('websocket_connected', handleConnect);
    window.addEventListener('websocket_error', handleError);
    
    reconnectAttempts = 0;
    socket.connect();
  });
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
  reconnectAttempts = 0;
}; 