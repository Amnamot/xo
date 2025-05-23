import { createLobby, createInviteWS } from './socket';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

class LobbyService {
  constructor() {
    this.listeners = new Map();
  }

  // Инициализация лобби
  async startLobby(socket, telegramId) {
    if (!socket || !telegramId) {
      throw new Error('Socket or telegramId is not initialized');
    }

    console.log('🎮 [LobbyService] Starting lobby:', {
      telegramId,
      socketId: socket.id,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    // Создаем лобби
    const lobbyResponse = await createLobby(socket, telegramId);
    
    console.log('✅ [LobbyService] Lobby created:', {
      response: lobbyResponse,
      socketId: socket.id,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    // Создаем приглашение
    const inviteData = await createInviteWS(socket, telegramId);
    
    console.log('📨 [LobbyService] Invite created:', {
      inviteData,
      socketId: socket.id,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    // Отправляем приглашение через Telegram
    if (window.Telegram?.WebApp?.shareMessage) {
      await window.Telegram.WebApp.shareMessage(inviteData.messageId);
    }

    return { lobbyResponse, inviteData };
  }

  // Отмена лобби
  async cancelLobby(socket, telegramId) {
    if (!socket || !telegramId) {
      throw new Error('Socket or telegramId is not initialized');
    }

    console.log('❌ [LobbyService] Cancelling lobby:', {
      telegramId,
      socketId: socket.id,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      socket.once('lobbyDeleted', () => {
        console.log('✅ [LobbyService] Lobby deleted:', {
          telegramId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        resolve();
      });

      socket.emit('cancelLobby', {
        telegramId: telegramId.toString()
      });
    });
  }

  // Подписка на события лобби
  subscribeToLobbyEvents(socket, telegramId, callbacks) {
    if (!socket || !telegramId) return;

    const { onGameStart, onUiState, onLobbyReady } = callbacks;

    if (onGameStart) {
      socket.on('gameStart', onGameStart);
      this.listeners.set('gameStart', onGameStart);
    }

    if (onUiState) {
      socket.on('uiState', onUiState);
      this.listeners.set('uiState', onUiState);
    }

    if (onLobbyReady) {
      socket.on('lobbyReady', onLobbyReady);
      this.listeners.set('lobbyReady', onLobbyReady);
    }

    // Отправляем начальное состояние
    socket.emit('uiState', { 
      state: 'waitModal', 
      telegramId,
      details: { timeLeft: LOBBY_LIFETIME }
    });
  }

  // Отписка от событий лобби
  unsubscribeFromLobbyEvents(socket) {
    if (!socket) return;

    this.listeners.forEach((callback, event) => {
      socket.off(event, callback);
    });
    this.listeners.clear();
  }
}

export const lobbyService = new LobbyService(); 