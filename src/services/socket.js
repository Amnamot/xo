// Функции для игровых событий
export const createLobby = async (socket, telegramId) => {
  if (!socket?.connected) {
    throw new Error('Socket is not connected');
  }

  console.log('🎮 [Socket] Creating lobby:', {
    telegramId,
    socketId: socket.id,
    connected: socket.connected,
    rooms: Array.from(socket.rooms || []),
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    socket.emit('createLobby', { telegramId }, (response) => {
      if (response.error) {
        console.error('❌ [Socket] Failed to create lobby:', {
          error: response.error,
          telegramId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        reject(new Error(response.error));
      } else {
        console.log('✅ [Socket] Lobby created:', {
          response,
          socketId: socket.id,
          rooms: Array.from(socket.rooms || []),
          timestamp: new Date().toISOString()
        });
        resolve(response);
      }
    });
  });
};

export const joinLobby = async (socket, telegramId, lobbyId) => {
  if (!socket?.connected) {
    throw new Error('Socket is not connected');
  }

  console.log('🎮 [Socket] Joining lobby:', {
    telegramId,
    lobbyId,
    socketId: socket.id,
    connected: socket.connected,
    rooms: Array.from(socket.rooms || []),
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    socket.emit('joinLobby', { telegramId, lobbyId }, (response) => {
      if (response.error) {
        console.error('❌ [Socket] Failed to join lobby:', {
          error: response.error,
          telegramId,
          lobbyId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        reject(new Error(response.error));
      } else {
        console.log('✅ [Socket] Joined lobby:', {
          response,
          socketId: socket.id,
          rooms: Array.from(socket.rooms || []),
          timestamp: new Date().toISOString()
        });
        resolve(response);
      }
    });
  });
};

export const updatePlayerTime = (socket, gameId, player, time) => {
  if (!socket?.connected) {
    console.warn('⚠️ [Socket] Cannot update player time - socket not connected');
    return;
  }

  socket.emit('updatePlayerTime', { gameId, player, time });
};

export const makeMove = async (socket, gameId, position, player, moveTime) => {
  if (!socket?.connected) {
    throw new Error('Socket is not connected');
  }

  console.log('🎯 [Socket] Making move:', {
    gameId,
    position,
    player,
    moveTime,
    socketId: socket.id,
    connected: socket.connected,
    rooms: Array.from(socket.rooms || []),
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    socket.emit('makeMove', { gameId, position, player, moveTime }, (response) => {
      if (response.error) {
        console.error('❌ [Socket] Failed to make move:', {
          error: response.error,
          gameId,
          position,
          player,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        reject(new Error(response.error));
      } else {
        console.log('✅ [Socket] Move made:', {
          response,
          socketId: socket.id,
          rooms: Array.from(socket.rooms || []),
          timestamp: new Date().toISOString()
        });
        resolve(response);
      }
    });
  });
};

export const updateViewport = (socket, gameId, viewport) => {
  if (!socket?.connected) {
    console.warn('⚠️ [Socket] Cannot update viewport - socket not connected');
    return;
  }

  socket.emit('updateViewport', { gameId, viewport });
};

export const confirmMoveReceived = (socket, gameId, moveId) => {
  socket.emit('moveReceived', { gameId, moveId });
};

export const createInviteWS = async (socket, telegramId) => {
  if (!socket?.connected) {
    throw new Error('Socket is not connected');
  }

  console.log('📨 [Socket] Creating invite:', {
    telegramId,
    socketId: socket.id,
    connected: socket.connected,
    rooms: Array.from(socket.rooms || []),
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    socket.emit('createInvite', { telegramId }, (response) => {
      if (response.error) {
        console.error('❌ [Socket] Failed to create invite:', {
          error: response.error,
          telegramId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        reject(new Error(response.error));
      } else {
        console.log('✅ [Socket] Invite created:', {
          response,
          socketId: socket.id,
          rooms: Array.from(socket.rooms || []),
          timestamp: new Date().toISOString()
        });
        resolve(response);
      }
    });
  });
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
  if (!socket?.connected) {
    throw new Error('Socket is not connected');
  }

  console.log('🔍 [Socket] Checking game state:', {
    telegramId,
    socketId: socket.id,
    connected: socket.connected,
    rooms: Array.from(socket.rooms || []),
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    socket.emit('checkGameState', { telegramId }, (response) => {
      if (response.error) {
        console.error('❌ [Socket] Failed to check game state:', {
          error: response.error,
          telegramId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        reject(new Error(response.error));
      } else {
        console.log('✅ [Socket] Game state checked:', {
          response,
          socketId: socket.id,
          rooms: Array.from(socket.rooms || []),
          timestamp: new Date().toISOString()
        });
        resolve(response);
      }
    });
  });
}; 