// src/services/game.js v1.0.3
class GameService {
  constructor() {
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 2000;
  }

  // Валидация состояния игры
  validateGameState(gameState) {
    if (!gameState || typeof gameState !== 'object') {
      throw new Error('Invalid game state: not an object');
    }

    const requiredFields = ['board', 'currentPlayer', 'scale', 'position'];
    const missingFields = requiredFields.filter(field => !(field in gameState));
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid game state: missing fields ${missingFields.join(', ')}`);
    }

    if (!Array.isArray(gameState.board)) {
      throw new Error('Invalid game state: board is not an array');
    }

    if (gameState.currentPlayer !== 'x' && gameState.currentPlayer !== 'o') {
      throw new Error('Invalid game state: invalid current player');
    }

    if (typeof gameState.scale !== 'number' || gameState.scale <= 0) {
      throw new Error('Invalid game state: invalid scale');
    }

    if (!gameState.position || 
        typeof gameState.position.x !== 'number' || 
        typeof gameState.position.y !== 'number') {
      throw new Error('Invalid game state: invalid position');
    }

    return true;
  }

  // Обработка подключения сокета
  handleSocketConnect(socket, onConnect) {
    if (!socket) return;

    console.log('✅ [GameService] Socket connected:', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    this.reconnectAttempts = 0;
    if (onConnect) onConnect();
  }

  // Обработка отключения сокета
  handleSocketDisconnect(socket, onDisconnect) {
    if (!socket) return;

    console.log('❌ [GameService] Socket disconnected:', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    if (onDisconnect) onDisconnect();
  }

  // Обработка ошибок сокета
  handleSocketError(socket, error, onError) {
    if (!socket) return;

    console.error('❌ [GameService] Socket error:', {
      error,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    if (onError) onError(error);
  }

  // Механизм переподключения
  async reconnect(socket, lobbyId, telegramId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    console.log('🔄 [GameService] Attempting to reconnect:', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    return this.joinGame(socket, lobbyId, telegramId);
  }

  // Улучшенный метод подключения к игре
  async joinGame(socket, lobbyId, telegramId) {
    if (!socket?.connected) {
      throw new Error('Socket is not connected');
    }

    console.log('🎮 [GameService] Joining game:', {
      lobbyId,
      telegramId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join game timeout'));
        }, 5000);

        socket.emit('joinLobby', { lobbyId, telegramId }, (response) => {
          clearTimeout(timeout);
          
          if (response.error) {
            console.error('❌ [GameService] Failed to join game:', {
              error: response.error,
              lobbyId,
              telegramId,
              timestamp: new Date().toISOString()
            });
            reject(new Error(response.error));
          } else {
            console.log('✅ [GameService] Successfully joined game:', {
              response,
              lobbyId,
              telegramId,
              timestamp: new Date().toISOString()
            });
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('❌ [GameService] Error joining game:', error);
      throw error;
    }
  }

  // Улучшенный метод подписки на события
  subscribeToGameEvents(socket, handlers) {
    if (!socket) {
      console.error('❌ [GameService] Cannot subscribe to events: socket is null');
      return;
    }

    console.log('🎮 [GameService] Subscribing to game events:', {
      socketId: socket.id,
      hasHandlers: {
        onGameStart: !!handlers.onGameStart,
        onGameState: !!handlers.onGameState,
        onMoveMade: !!handlers.onMoveMade,
        onPlayerDisconnected: !!handlers.onPlayerDisconnected,
        onGameEnded: !!handlers.onGameEnded
      },
      timestamp: new Date().toISOString()
    });

    const { 
      onGameStart, 
      onGameState, 
      onMoveMade, 
      onPlayerDisconnected, 
      onGameEnded,
      onConnect,
      onDisconnect,
      onError
    } = handlers;

    // Подписываемся на события сокета
    socket.on('connect', () => this.handleSocketConnect(socket, onConnect));
    socket.on('disconnect', () => this.handleSocketDisconnect(socket, onDisconnect));
    socket.on('error', (error) => this.handleSocketError(socket, error, onError));

    // Подписываемся на события игры
    if (onGameStart) {
      socket.on('gameStart', (data) => {
        console.log('🎯 [GameService] Game started:', {
          data,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        onGameStart(data);
      });
    }

    if (onGameState) {
      socket.on('gameState', (gameState) => {
        try {
          console.log('📊 [GameService] Raw game state received:', {
            gameState,
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });

          this.validateGameState(gameState);
          console.log('📊 [GameService] Game state validated:', {
            gameState,
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });

          onGameState(gameState);
        } catch (error) {
          console.error('❌ [GameService] Invalid game state:', {
            error: error.message,
            gameState,
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
          if (onError) onError(error);
        }
      });
    }

    if (onMoveMade) {
      socket.on('moveMade', (data) => {
        console.log('🎯 [GameService] Move made:', {
          data,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        onMoveMade(data);
      });
    }

    if (onPlayerDisconnected) {
      socket.on('playerDisconnected', (data) => {
        console.log('👋 [GameService] Player disconnected:', {
          data,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        onPlayerDisconnected(data);
      });
    }

    if (onGameEnded) {
      socket.on('gameEnded', (data) => {
        console.log('🏁 [GameService] Game ended:', {
          data,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        onGameEnded(data);
      });
    }
  }

  // Улучшенный метод отписки от событий
  unsubscribeFromGameEvents(socket) {
    if (!socket) return;

    // Отписываемся от событий сокета
    socket.off('connect');
    socket.off('disconnect');
    socket.off('error');

    // Отписываемся от событий игры
    socket.off('gameStart');
    socket.off('gameState');
    socket.off('moveMade');
    socket.off('playerDisconnected');
    socket.off('gameEnded');

    console.log('👋 [GameService] Unsubscribed from all events:', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  }

  // Улучшенный метод хода
  async makeMove(socket, gameId, position, player, moveTime) {
    if (!socket?.connected) {
      throw new Error('Socket is not connected');
    }

    console.log('🎯 [GameService] Making move:', {
      gameId,
      position,
      player,
      moveTime,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Make move timeout'));
        }, 5000);

        socket.emit('makeMove', { gameId, position, player, moveTime }, (response) => {
          clearTimeout(timeout);

          if (response.error) {
            console.error('❌ [GameService] Failed to make move:', {
              error: response.error,
              gameId,
              position,
              player,
              timestamp: new Date().toISOString()
            });
            reject(new Error(response.error));
          } else {
            console.log('✅ [GameService] Move made:', {
              response,
              socketId: socket.id,
              timestamp: new Date().toISOString()
            });
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('❌ [GameService] Error making move:', error);
      throw error;
    }
  }
}

export const gameService = new GameService(); 