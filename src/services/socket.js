import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

// Создаем экземпляр Socket.io
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  query: {
    telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  }
});

// Обработчики событий по умолчанию
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Функции-хелперы для работы с сокетами
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Функции для игровых событий
export const createLobby = (telegramId) => {
  return new Promise((resolve) => {
    socket.emit('createLobby', { telegramId }, resolve);
  });
};

export const joinLobby = (lobbyId, telegramId) => {
  return new Promise((resolve) => {
    socket.emit('joinLobby', { lobbyId, telegramId }, resolve);
  });
};

export const makeMove = (gameId, position, player, moveTime) => {
  return new Promise((resolve) => {
    socket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updatePlayerTime = (gameId, playerTimes) => {
  socket.emit('updatePlayerTime', { gameId, playerTimes });
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