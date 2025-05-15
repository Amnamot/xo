// src/StartScreen.jsx v15
import WaitModal from './components/WaitModal';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';
import { 
  initSocket, 
  getSocket, 
  isSocketConnected, 
  reconnectSocket, 
  connectSocket,
  createInviteWS 
} from './services/socket';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  const initializeSocket = useCallback(async () => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setError(null);

      if (!telegramId) {
        throw new Error('Telegram WebApp not initialized');
      }

      console.log('🚀 Initializing socket connection', {
        telegramId,
        timestamp: new Date().toISOString()
      });

      // Подключаем сокет
      await connectSocket();
      const socket = initSocket();
      
      if (!socket) {
        throw new Error('Failed to initialize socket');
      }

      socketRef.current = socket;

      // Настраиваем обработчики событий
      socket.on('gameStart', (data) => {
        if (!socketRef.current) return;
        
        console.log('✅ Received gameStart event:', {
          data,
          timestamp: new Date().toISOString()
        });
        
        navigate(`/game/${data.session.id}`, { replace: true });
      });

      socket.on('setShowWaitModal', (data) => {
        if (!socketRef.current) return;
        
        console.log('📱 Received setShowWaitModal event:', {
          data,
          timestamp: new Date().toISOString()
        });
        
        setShowWaitModal(data.show);
        
        if (data.show && telegramId) {
          socket.emit('uiState', {
            state: 'waitModal',
            telegramId,
            details: {
              timeLeft: data.ttl,
              isReconnect: true
            }
          });
        }
      });

      // Обработчики состояния подключения
      socket.on('connect', () => {
        if (!socketRef.current) return;
        
        console.log('✅ Socket connected:', {
          id: socket.id,
          timestamp: new Date().toISOString()
        });
        setIsConnecting(false);
        setError(null);
      });

      socket.on('connect_error', (error) => {
        if (!socketRef.current) return;
        
        console.error('❌ Socket connection error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        setError('Failed to connect to game server');
        setIsConnecting(false);
      });

      socket.on('disconnect', () => {
        if (!socketRef.current) return;
        
        console.log('🔌 Socket disconnected:', {
          timestamp: new Date().toISOString()
        });
        
        // Пробуем переподключиться
        reconnectSocket();
      });

      socket.on('lobbyDeleted', (data) => {
        if (!socketRef.current) return;
        
        console.log('🗑️ Received lobbyDeleted event:', {
          data,
          timestamp: new Date().toISOString()
        });
        
        setShowWaitModal(false);
      });

    } catch (error) {
      if (!socketRef.current) return;
      
      console.error('❌ Socket initialization error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      setError(error.message);
      setIsConnecting(false);
    }
  }, [isConnecting, telegramId, navigate]);

  useEffect(() => {
    // Проверяем состояние лобби из localStorage
    const checkLobbyState = () => {
      const showWaitModalFlag = localStorage.getItem('showWaitModal');
      const lobbyStatus = localStorage.getItem('lobbyStatus');
      const lobbyTTL = localStorage.getItem('lobbyTTL');

      if (showWaitModalFlag === 'true' && lobbyStatus && lobbyTTL) {
        setShowWaitModal(true);
        initializeSocket();
        // Очищаем флаги после использования
        localStorage.removeItem('showWaitModal');
        localStorage.removeItem('lobbyStatus');
        localStorage.removeItem('lobbyTTL');
      }
    };

    // Загружаем данные пользователя
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    checkLobbyState();

    return () => {
      const socket = socketRef.current;
      if (socket) {
        console.log('👋 Cleaning up socket listeners');
        socket.off('gameStart');
        socket.off('setShowWaitModal');
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('lobbyDeleted');
      }
    };
  }, [navigate, telegramId, isConnecting, initializeSocket]);

  const handleCreateGame = async () => {
    try {
      if (!telegramId) {
        throw new Error('Telegram ID is not available');
      }

      await initializeSocket();
      const socket = getSocket();
      if (!socket || !isSocketConnected()) {
        throw new Error('Socket not connected');
      }

      setShowWaitModal(true);
      
      console.log('Creating lobby with telegramId:', telegramId);
      
      // Создаем лобби и ждем ответ
      const lobbyResponse = await new Promise((resolve, reject) => {
        socket.emit('createLobby', { telegramId: telegramId.toString() }, (response) => {
          if (response?.status === 'error') {
            reject(new Error(response.message));
          } else {
            resolve(response);
          }
        });
      });

      // Проверяем статус создания лобби
      if (lobbyResponse.status !== 'created') {
        throw new Error('Failed to create lobby: invalid status');
      }

      // Создаем инвайт и показываем модальное окно Telegram
      try {
        const inviteResponse = await createInviteWS(telegramId);
        if (inviteResponse?.messageId) {
          window.Telegram?.WebApp?.shareMessage(inviteResponse.messageId);
        } else {
          console.error('Invalid invite response:', inviteResponse);
          setError('Failed to create invite link. Please try again.');
        }
      } catch (inviteError) {
        console.error('Failed to create invite:', inviteError);
        setError('Failed to create invite. Please try again.');
      }

      // Отправляем состояние UI
      if (telegramId) {
        socket.emit('uiState', {
          state: 'waitModal',
          telegramId,
          details: { isCreate: true }
        });
      }

    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game. Please try again.');
      setShowWaitModal(false);
    }
  };

  const handleCancelLobby = async () => {
    try {
      const socket = getSocket();
      if (!socket || !isSocketConnected()) {
        throw new Error('Socket not connected');
      }

      console.log('🔄 Cancelling lobby...', {
        telegramId,
        timestamp: new Date().toISOString()
      });

      // Отправляем запрос на отмену лобби
      socket.emit('cancelLobby', { telegramId }, (response) => {
        if (response?.status === 'error') {
          console.error('Failed to cancel lobby:', response.message);
          setError('Failed to cancel lobby. Please try again.');
        } else {
          console.log('✅ Lobby cancelled successfully');
          setShowWaitModal(false);
        }
      });

    } catch (error) {
      console.error('Failed to cancel lobby:', error);
      setError('Failed to cancel lobby. Please try again.');
    }
  };

  const screenWidth = window.innerWidth;
  const containerWidth = (screenWidth / 12) * 10;

  const showEndingGames = user?.numGames >= 9;
  const showStarInfo = user?.numGames >= 11;
  const showTopUp = user?.numGames >= 11 && user?.stars <= 10;
  const disableStart = user?.numGames >= 12 && user?.stars < 10;

  const getEndingText = () => {
    if (user.numGames === 11) {
      return "У тебя осталась одна игра\nYou need to top up your balance";
    }
    if (user.numGames >= 12 && user.stars < 10) {
      return "Стоимость одной игры 10 звезд\nTop up your balance";
    }
    if (user.numGames >= 9 && user.stars <= 10) {
      return "У тебя заканчиваются игры\nПотом тебе потребуются звезды";
    }
    return null;
  };

  if (!user) return null;

  return (
    <div className="start-screen">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
      
      <button
        className="create-game-btn"
        onClick={handleCreateGame}
        disabled={isConnecting || !telegramId}
      >
        {isConnecting ? 'Connecting...' : 'Create Game'}
      </button>

      {showWaitModal && (
        <WaitModal
          onCancel={handleCancelLobby}
          isVisible={showWaitModal}
        />
      )}

      {showTopUpModal && (
        <TopUpModal
          onClose={() => setShowTopUpModal(false)}
          isVisible={showTopUpModal}
        />
      )}

      <div className="top-logo">
        <img src="../media/3tICO.svg" width={128} alt="Logo" />
      </div>

      <div className="user-info">
        <img className="ava1" src={user.avatar} alt="avatar" />
        <div className="user-data">
          <div className="name1">{user.firstName}</div>
          <div className="stata1">
            Games: <span className="stata2">{user.numGames}</span> Wins: <span className="stata2">{user.numWins}</span>
          </div>
        </div>
      </div>

      {showEndingGames && (
        <div className="ninegames" style={{ width: containerWidth }}>
          <div className="endinggames">{getEndingText()}</div>

          {showStarInfo && (
            <div className="starinfo">
              <div className="balance">Balance</div>
              <div className="star">
                <img src="/media/TGstar.svg" alt="star" />
              </div>
              <div className="starsvalue">{user.stars}</div>
            </div>
          )}

          {showTopUp && (
            <button className="topup" onClick={() => setShowTopUpModal(true)}>
              Top up
            </button>
          )}
        </div>
      )}

      <div
        className="bottom-block"
        style={{
          width: containerWidth,
          opacity: disableStart ? 0.3 : 1,
          pointerEvents: disableStart ? 'none' : 'auto',
        }}
      >
        <div className="call1">
          To start the game by inviting an opponent, just click on this button
        </div>
        {user.numGames >= 12 ? (
          <button
            className="button2"
            onClick={handleCreateGame}
            disabled={disableStart}
          >
            Start for 10 stars
          </button>
        ) : (
          <button className="button1" onClick={handleCreateGame}>
            Start
          </button>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
