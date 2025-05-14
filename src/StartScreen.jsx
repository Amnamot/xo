// src/StartScreen.jsx v14
import WaitModal from './components/WaitModal';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';
import { initSocket, connectSocket, disconnectSocket, createLobby, createInviteWS } from './services/socket';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const initData = window.Telegram?.WebApp?.initData;
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    // Подключаем сокет сразу
    const socket = initSocket();
    socketRef.current = socket;

    // Сначала устанавливаем все слушатели событий
    socket.on('gameStart', (data) => {
      console.log('✅ Received gameStart event:', data);
      navigate(`/game/${data.session.id}`, { replace: true });
    });

    socket.on('setShowWaitModal', (data) => {
      console.log('📱 Received setShowWaitModal event:', data);
      if (data.show) {
        setShowWaitModal(true);
        if (telegramId) {
          socket.emit('uiState', { 
            state: 'waitModal', 
            telegramId,
            details: { 
              timeLeft: data.ttl,
              isReconnect: true 
            }
          });
        }
      } else {
        setShowWaitModal(false);
      }
    });

    const initializeUI = async () => {
      try {
        // Проверяем наличие активного лобби при инициализации
        if (telegramId) {
          socket.emit('checkActiveLobby', { telegramId }, (response) => {
            console.log('🔍 Checking active lobby response:', response);
            if (response?.lobbyId && response?.ttl > 0) {
              setShowWaitModal(true);
              socket.emit('uiState', { 
                state: 'waitModal', 
                telegramId,
                details: { 
                  timeLeft: response.ttl,
                  isReconnect: true 
                }
              });
            }
          });
        }

        // Отправляем начальное состояние UI только если есть telegramId
        if (telegramId) {
          socket.emit('uiState', { 
            state: 'loader', 
            telegramId,
            details: { progress: 0 }
          });
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          if (!parsed.avatar) {
            const tgPhoto = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
            if (tgPhoto) {
              parsed.avatar = tgPhoto;
            }
          }

          setUser(parsed);
          
          // Проверяем флаг showWaitModal
          const shouldShowWaitModal = localStorage.getItem('showWaitModal') === 'true';
          if (shouldShowWaitModal) {
            const ttl = parseInt(localStorage.getItem('lobbyTTL') || '180', 10);
            setShowWaitModal(true);
            
            // Очищаем флаги
            localStorage.removeItem('showWaitModal');
            localStorage.removeItem('lobbyTTL');
            
            // Отправляем состояние UI только если есть telegramId
            if (telegramId) {
              socket.emit('uiState', { 
                state: 'waitModal', 
                telegramId,
                details: { 
                  timeLeft: ttl,
                  isReconnect: true 
                }
              });
            }
          } else {
            // Логируем показ стартового экрана только если есть telegramId
            if (telegramId) {
              socket.emit('uiState', { 
                state: 'startScreen', 
                telegramId,
                details: { 
                  numGames: parsed.numGames, 
                  numWins: parsed.numWins 
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize UI:", error);
      }
    };

    initializeUI();

    const rawInitData = window.Telegram?.WebApp?.initData;
    if (rawInitData) {
      const clean = new URLSearchParams(rawInitData);
      clean.delete('signature');
      console.log("🧾 Clean initData:", clean.toString());
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('gameStart');
        socketRef.current.off('setShowWaitModal');
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
      }
    };
  }, [navigate, telegramId]);

  const handleCancelLobby = async () => {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    if (!telegramId) {
      console.error("Missing telegramId for lobby cancellation");
      setShowWaitModal(false);
      return;
    }

    try {
      const socket = initSocket();
      // Отправляем событие отмены лобби через WebSocket
      socket.emit('cancelLobby', {
        telegramId: telegramId.toString()
      });

      // Отключаем WebSocket после отмены лобби
      if (socket.connected) {
        socket.disconnect();
      }

      setShowWaitModal(false);
    } catch (error) {
      console.error('Failed to cancel lobby:', error);
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

  const handleStartGame = async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) {
        throw new Error("Missing Telegram ID");
      }

      // Подключаем WebSocket
      console.log('🔄 Connecting to WebSocket...');
      await connectSocket();
      console.log('✅ WebSocket connected successfully');

      // Создаем Promise для ожидания готовности лобби
      console.log('⏳ Setting up lobby ready listener');
      const lobbyReadyPromise = new Promise((resolve, reject) => {
        const socket = initSocket();
        console.log('🔌 Socket instance for lobby ready:', socket.id);
        
        let timeoutId = setTimeout(() => {
          console.error('❌ Lobby creation timeout. Socket state:', {
            id: socket.id,
            connected: socket.connected,
            disconnected: socket.disconnected
          });
          reject(new Error('Lobby creation timeout'));
        }, 5000);
        
        socket.once('lobbyReady', (data) => {
          clearTimeout(timeoutId);
          console.log('✅ Received lobbyReady event:', data);
          resolve(data);
        });
      });

      // Создаем лобби через WebSocket
      console.log('🎲 Creating lobby...');
      const lobbyResponse = await createLobby(telegramId.toString());
      console.log('📦 Lobby creation response:', lobbyResponse);

      // Ожидаем подтверждения готовности лобби
      console.log('⏳ Waiting for lobby ready confirmation...');
      await lobbyReadyPromise;
      
      // Показываем модальное окно ожидания
      setShowWaitModal(true);
      console.log('👁️ Showing wait modal');

      // Создание инвайта через WebSocket
      console.log('📤 Creating invite via WebSocket...', {
        telegramId,
        timestamp: new Date().toISOString()
      });
      
      const inviteData = await createInviteWS(telegramId.toString());
      console.log('📬 Invite created:', {
        ...inviteData,
        timestamp: new Date().toISOString()
      });

      // Отправка сообщения через Telegram
      console.log('📱 Preparing to share message via Telegram...', {
        messageId: inviteData.messageId,
        timestamp: new Date().toISOString()
      });
      
      const shareResult = await window.Telegram?.WebApp?.shareMessage(inviteData.messageId);
      console.log('📨 Share message result:', {
        success: true,
        messageId: inviteData.messageId,
        timestamp: new Date().toISOString(),
        shareResult
      });

    } catch (err) {
      console.error('❌ Error during game start:', {
        error: err,
        message: err.message,
        timestamp: new Date().toISOString()
      });
      
      setShowWaitModal(false);
      
      // Отключаем WebSocket при ошибке
      const socket = initSocket();
      if (socket.connected) {
        console.log('🔌 Disconnecting WebSocket due to error');
        disconnectSocket();
      }
      
      alert(err.message || "Ошибка при создании лобби");
    }
  };

  if (!user) return null;

  return (
    <div className="start-screen">
      {showWaitModal && <WaitModal onCancel={handleCancelLobby} />}
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
            onClick={handleStartGame}
            disabled={disableStart}
          >
            Start for 10 stars
          </button>
        ) : (
          <button className="button1" onClick={handleStartGame}>
            Start
          </button>
        )}
      </div>

      {showTopUpModal && <TopUpModal onClose={() => setShowTopUpModal(false)} />}
    </div>
  );
};

export default StartScreen;
