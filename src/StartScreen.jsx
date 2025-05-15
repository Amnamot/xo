// src/StartScreen.jsx v15
import WaitModal from './components/WaitModal';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';
import { initSocket, getSocket, isSocketConnected, reconnectSocket, connectSocket } from './services/socket';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  const initializeSocket = async () => {
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

      // Отправляем состояние UI
      socket.emit('uiState', { 
        state: 'startScreen', 
        telegramId,
        details: { 
          isReconnect: false 
        }
      });

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

    } catch (error) {
      if (!socketRef.current) return;
      
      console.error('❌ Socket initialization error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      setError(error.message);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

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
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        console.log('👋 Cleaning up socket listeners');
        socket.off('gameStart');
        socket.off('setShowWaitModal');
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
      }
    };
  }, [navigate, telegramId, isConnecting]);

  const handleCreateGame = async () => {
    try {
      await initializeSocket();
      const socket = getSocket();
      if (!socket || !isSocketConnected()) {
        throw new Error('Socket not connected');
      }

      setShowWaitModal(true);
      socket.emit('createLobby', { telegramId });
      
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
          onClose={() => setShowWaitModal(false)}
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
