// import { io } from 'socket.io-client';

// Функции для игровых событий
export const createLobby = async (socket, telegramId) => {
  try {
    console.log('🎮 [Socket Service] Creating lobby:', {
      telegramId,
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

export const joinLobby = (socket, lobbyId, telegramId) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('WebSocket is not connected'));
      return;
    }

    socket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
      if (response?.status === 'error') {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });
};

export const updatePlayerTime = (socket, gameId, playerTimes) => {
  if (socket.connected) {
    socket.emit('updatePlayerTime', { gameId, playerTimes });
  }
};

export const makeMove = (socket, gameId, position, player, moveTime) => {
  return new Promise((resolve) => {
    socket.emit('makeMove', { gameId, position, player, moveTime }, resolve);
  });
};

export const updateViewport = (socket, gameId, viewport) => {
  socket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = (socket, gameId, moveId) => {
  socket.emit('moveReceived', { gameId, moveId });
};

export const createInviteWS = async (socket, telegramId) => {
  try {
    console.log('📨 [Socket Service] Creating invite:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

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
export const subscribeToGameEvents = (socket, handlers) => {
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

export const checkAndRestoreGameState = async (socket, telegramId) => {
  try {
    console.log('🔍 [Socket Service] Checking game state:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

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