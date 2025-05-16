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
    const initializeUI = async () => {
      try {
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
        }
      } catch (error) {
        console.error("Failed to initialize UI:", error);
      }
    };

    initializeUI();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('gameStart');
        socketRef.current.off('setShowWaitModal');
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
      }
    };
  }, []);

  const handleStartGame = async () => {
    console.log('🎮 [StartGame] Button clicked');
    
    try {
      // Проверяем наличие telegramId
      if (!telegramId) {
        console.error('❌ [StartGame] Missing Telegram ID');
        throw new Error("Missing Telegram ID");
      }

      console.log('👤 [StartGame] Using Telegram ID:', telegramId);

      // Проверяем текущее состояние сокета
      console.log('🔍 [StartGame] Current socket state:', {
        exists: socketRef.current ? 'yes' : 'no',
        connected: socketRef.current?.connected ? 'yes' : 'no',
        id: socketRef.current?.id
      });

      // Инициализируем соединение
      console.log('🔄 [StartGame] Connecting to WebSocket...');
      
      try {
        await connectSocket();
        const socket = initSocket();
        socketRef.current = socket;
        
        console.log('✅ [StartGame] Socket initialized:', {
          id: socket.id,
          connected: socket.connected,
          readyState: socket.readyState
        });

        // Устанавливаем обработчики событий
        console.log('🎮 [StartGame] Setting up game event handlers');
        
        socket.on('gameStart', (data) => {
          console.log('✨ [Game Events] Received gameStart event:', {
            socketDetails: {
              id: socket.id,
              connected: socket.connected,
              transport: socket.io?.engine?.transport?.name || 'unknown',
              rooms: Array.from(socket.rooms || []),
            },
            gameDetails: {
              sessionId: data.session.id,
              creator: data.creator,
              opponent: data.opponent,
              currentUser: telegramId,
              isCreator: telegramId === data.creator,
            },
            connectionState: {
              readyState: socket.io?.engine?.readyState,
              wasConnected: socket.connected,
              reconnecting: socket.io?.engine?.reconnecting || false,
            },
            timestamp: new Date().toISOString()
          });
          
          // Проверяем состояние подключения
          if (!socket.connected) {
            console.warn('⚠️ [Game Events] Socket disconnected before navigation:', {
              socketId: socket.id,
              lastError: socket.io?.engine?.transport?.lastError,
              timestamp: new Date().toISOString()
            });
            socket.connect();
          }
          
          navigate(`/game/${data.session.id}`, { replace: true });
        });

        socket.on('connect', () => {
          console.log('🔌 [Socket Events] Socket connected:', {
            socketId: socket.id,
            transport: socket.io?.engine?.transport?.name,
            upgrades: socket.io?.engine?.upgrades || [],
            timestamp: new Date().toISOString()
          });
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 [Socket Events] Socket disconnected:', {
            reason,
            socketId: socket.id,
            wasConnected: socket.connected,
            lastError: socket.io?.engine?.transport?.lastError,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('setShowWaitModal', (data) => {
          console.log('📱 [Game Events] Received setShowWaitModal event:', {
            socketId: socket.id,
            data,
            timestamp: new Date().toISOString(),
            connected: socket.connected
          });
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

        // Создаем Promise для ожидания готовности лобби
        console.log('⏳ [Lobby] Setting up lobby ready listener');
        const lobbyReadyPromise = new Promise((resolve, reject) => {
          let timeoutId = setTimeout(() => {
            console.error('❌ [Lobby] Lobby creation timeout');
            reject(new Error('Lobby creation timeout'));
          }, 5000);
          
          socket.once('lobbyReady', (data) => {
            clearTimeout(timeoutId);
            console.log('✅ [Lobby] Received lobbyReady event:', {
              socketId: socket.id,
              data,
              timestamp: new Date().toISOString(),
              connected: socket.connected
            });
            resolve(data);
          });
        });

        // Создаем лобби
        console.log('🎲 [Lobby] Creating lobby...', {
          socketId: socket.id,
          telegramId,
          timestamp: new Date().toISOString()
        });
        
        const lobbyResponse = await createLobby(telegramId);
        console.log('✅ [Lobby] Lobby created:', {
          socketId: socket.id,
          response: lobbyResponse,
          timestamp: new Date().toISOString(),
          connected: socket.connected
        });

        // Ожидаем подтверждения готовности лобби
        console.log('⏳ Waiting for lobby ready confirmation...');
        await lobbyReadyPromise;

        // Показываем модальное окно ожидания
        setShowWaitModal(true);
        console.log('👁️ Showing wait modal');

        // Отправляем состояние UI
        if (telegramId) {
          socket.emit('uiState', { 
            state: 'waitModal', 
            telegramId,
            details: { 
              timeLeft: lobbyResponse.ttl,
              isReconnect: false 
            }
          });
        }

        // Создаем инвайт
        console.log('📤 Creating invite...');
        const inviteData = await createInviteWS(telegramId);
        console.log('📬 Invite created:', inviteData);

        // Отправляем через Telegram
        if (window.Telegram?.WebApp?.shareMessage) {
          console.log('📱 Sharing message via Telegram...');
          await window.Telegram.WebApp.shareMessage(inviteData.messageId);
          console.log('📨 Message shared successfully');
        }

      } catch (error) {
        console.error('Failed to start game:', error);
        
        setShowWaitModal(false);
        
        // Отключаем сокет при ошибке
        if (socketRef.current?.connected) {
          console.log('🔌 Disconnecting socket due to error');
          socketRef.current.disconnect();
        }
        
        // Показываем ошибку пользователю
        alert(error.message || 'Failed to start game. Please try again.');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      
      setShowWaitModal(false);
      
      // Отключаем сокет при ошибке
      if (socketRef.current?.connected) {
        console.log('🔌 Disconnecting socket due to error');
        socketRef.current.disconnect();
      }
      
      // Показываем ошибку пользователю
      alert(error.message || 'Failed to start game. Please try again.');
    }
  };

  const handleCancelLobby = async () => {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    if (!telegramId) {
      console.error("❌ Missing telegramId for lobby cancellation");
      setShowWaitModal(false);
      return;
    }

    console.log('🔄 Starting lobby cancellation process for user:', telegramId);

    try {
      const socket = initSocket();
      
      // Создаем Promise для ожидания ответа от сервера
      const cancelPromise = new Promise((resolve, reject) => {
        // Устанавливаем таймаут
        const timeoutId = setTimeout(() => {
          console.error('⏰ Lobby cancellation timeout after 5 seconds');
          reject(new Error('Lobby cancellation timeout'));
        }, 5000);

        // Слушаем событие подтверждения удаления
        socket.once('lobbyDeleted', (data) => {
          clearTimeout(timeoutId);
          console.log('✅ Received lobby deletion confirmation:', {
            reason: data.reason,
            timestamp: new Date(data.timestamp).toISOString()
          });
          resolve(data);
        });

        // Отправляем событие отмены лобби
        console.log('📤 Sending cancelLobby request...');
        socket.emit('cancelLobby', {
          telegramId: telegramId.toString()
        }, (response) => {
          console.log('📨 Received cancelLobby response:', response);
          if (response?.status === 'error') {
            clearTimeout(timeoutId);
            reject(new Error(response.message || 'Failed to cancel lobby'));
          }
        });
      });

      // Ждем ответа от сервера
      console.log('⏳ Waiting for server confirmation...');
      await cancelPromise;

      // Только после успешного удаления закрываем модальное окно
      console.log('🚫 Closing WaitModal...');
      setShowWaitModal(false);

      // И только потом отключаем сокет
      if (socket.connected) {
        console.log('🔌 Disconnecting socket...');
        socket.disconnect();
      }

      console.log('✅ Lobby cancellation process completed successfully');

    } catch (error) {
      console.error('❌ Failed to cancel lobby:', {
        error: error.message,
        stack: error.stack
      });
      // В случае ошибки тоже закрываем модальное окно
      setShowWaitModal(false);
      alert(error.message || "Failed to cancel lobby");
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
