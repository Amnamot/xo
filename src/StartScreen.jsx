// src/StartScreen.jsx v14
import WaitModal from './components/WaitModal';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';
import { 
  initSocket, 
  connectSocket, 
  disconnectSocket, 
  createLobby, 
  createInviteWS,
  checkAndRestoreGameState 
} from './services/socket';
import logoIcon from './media/3tbICO.svg';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [creatorMarker, setCreatorMarker] = useState('');
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
  }, []);

  useEffect(() => {
    const initializeSocket = async () => {
      if (!telegramId) return;
      
      try {
        console.log('🔌 [StartScreen] Initializing socket connection:', {
          telegramId,
          timestamp: new Date().toISOString()
        });

        // Получаем существующее или создаем новое подключение
        const socket = await initSocket();
        socketRef.current = socket;

        console.log('🔍 [StartScreen] Socket state after connection:', {
          socketId: socket.id,
          connected: socket.connected,
          rooms: Array.from(socket.rooms || []),
          hasGameStartListener: socket.listeners('gameStart').length,
          timestamp: new Date().toISOString()
        });

        // Регистрируем обработчик gameStart до всех остальных операций
        console.log('🎮 [StartScreen] Registering gameStart handler');
        socket.off('gameStart').on('gameStart', (data) => {
          console.log('🎮 [StartScreen] Received gameStart event:', {
            session: data?.session,
            telegramId,
            socketId: socket.id,
            connected: socket.connected,
            rooms: Array.from(socket.rooms || []),
            hasGameStartListener: socket.listeners('gameStart').length,
            timestamp: new Date().toISOString()
          });

          if (data && data.session && data.session.id) {
            console.log('🎯 [StartScreen] Navigating to game:', {
              gameId: data.session.id,
              telegramId,
              socketState: {
                connected: socket.connected,
                rooms: Array.from(socket.rooms || []),
                listeners: {
                  gameStart: socket.listeners('gameStart').length,
                  lobbyReady: socket.listeners('lobbyReady').length,
                  setShowWaitModal: socket.listeners('setShowWaitModal').length
                }
              },
              timestamp: new Date().toISOString()
            });
            setShowWaitModal(false);
            navigate(`/game/${data.session.id}`);
          } else {
            console.warn('⚠️ [StartScreen] Invalid gameStart data:', {
              data,
              telegramId,
              socketState: {
                connected: socket.connected,
                rooms: Array.from(socket.rooms || [])
              },
              timestamp: new Date().toISOString()
            });
          }
        });

        socket.on('setShowWaitModal', (data) => {
          console.log('🎯 [StartScreen] Received setShowWaitModal event:', {
            show: data.show,
            creatorMarker: data.creatorMarker,
            telegramId,
            timestamp: new Date().toISOString()
          });

          if (data.show) {
            setShowWaitModal(true);
            if (data.creatorMarker) {
              setCreatorMarker(data.creatorMarker);
            }
          } else {
            setShowWaitModal(false);
          }
        });

        socket.on('lobbyReady', (data) => {
          console.log('🎯 [StartScreen] Received lobbyReady event:', {
            lobbyId: data.lobbyId,
            creatorMarker: data.creatorMarker,
            telegramId,
            socketState: {
              socketId: socket.id,
              connected: socket.connected,
              rooms: Array.from(socket.rooms || []),
              listeners: {
                gameStart: socket.listeners('gameStart').length,
                lobbyReady: socket.listeners('lobbyReady').length
              }
            },
            timestamp: new Date().toISOString()
          });

          if (data.creatorMarker) {
            console.log('✅ [StartScreen] Setting creator marker:', {
              marker: data.creatorMarker,
              telegramId,
              socketState: {
                rooms: Array.from(socket.rooms || [])
              },
              timestamp: new Date().toISOString()
            });
            setCreatorMarker(data.creatorMarker);
            setShowWaitModal(true);
          }
        });

        // Проверяем сохраненное состояние при инициализации
        try {
          console.log('🔍 [StartScreen] Checking saved game state:', {
            telegramId,
            socketState: {
              connected: socket.connected,
              rooms: Array.from(socket.rooms || [])
            },
            timestamp: new Date().toISOString()
          });

          const gameState = await checkAndRestoreGameState(telegramId);
          if (gameState?.gameId) {
            console.log('🔄 [StartScreen] Found saved game:', {
              gameId: gameState.gameId,
              socketState: {
                connected: socket.connected,
                rooms: Array.from(socket.rooms || [])
              },
              timestamp: new Date().toISOString()
            });
            navigate(`/game/${gameState.gameId}`);
          }
        } catch (error) {
          console.warn('⚠️ [StartScreen] No saved game state found:', {
            error: error.message,
            socketState: {
              connected: socket.connected,
              rooms: Array.from(socket.rooms || [])
            },
            timestamp: new Date().toISOString()
          });
        }

        // Добавляем обработчик изменения состояния окна
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.onEvent('viewportChanged', async () => {
            const isExpanded = window.Telegram.WebApp.isExpanded;
            if (isExpanded) {
              try {
                console.log('🔄 [Viewport Expanded] Attempting to reconnect');
                await connectSocket();
                const socket = initSocket();

                // Используем текущий telegramId вместо сохраненного
                console.log('🔍 [Viewport Expanded] Checking active lobby for:', {
                  telegramId,
                  timestamp: new Date().toISOString()
                });
                
                socket.emit('checkActiveLobby', { telegramId }, async (response) => {
                  if (response?.lobbyId) {
                    console.log('🎯 [Viewport Expanded] Found active lobby:', {
                      lobbyId: response.lobbyId,
                      telegramId,
                      timestamp: new Date().toISOString()
                    });
                    
                    // Переподключаемся к лобби и ждем ответа
                    await new Promise((resolve) => {
                      socket.emit('joinLobby', { 
                        telegramId,
                        lobbyId: response.lobbyId
                      }, (joinResponse) => {
                        console.log('✅ [Viewport Expanded] Lobby join result:', {
                          status: joinResponse?.status,
                          lobbyId: response.lobbyId,
                          telegramId,
                          timestamp: new Date().toISOString()
                        });
                        resolve(joinResponse);
                      });
                    });
                  }
                });
              } catch (error) {
                console.error('❌ [Viewport Expanded] Error:', {
                  error: error.message,
                  telegramId,
                  timestamp: new Date().toISOString()
                });
              }
            }
          });
        }

      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('gameStart');
        socketRef.current.off('setShowWaitModal');
        socketRef.current.off('lobbyReady');
        // Не отключаем сокет при размонтировании компонента
        // if (socketRef.current.connected) {
        //   socketRef.current.disconnect();
        // }
      }
    };
  }, [telegramId, navigate]);

  const handleStartGame = async () => {
    try {
      if (!telegramId) {
        throw new Error("Missing Telegram ID");
      }

      console.log('🎮 [StartScreen] Starting game:', {
        telegramId,
        timestamp: new Date().toISOString()
      });

      const lobbyResponse = await createLobby(telegramId);
      console.log('✅ [StartScreen] Lobby created:', {
        response: lobbyResponse,
        telegramId,
        timestamp: new Date().toISOString()
      });

      setShowWaitModal(true);

      const inviteData = await createInviteWS(telegramId);
      console.log('📨 [StartScreen] Invite created:', {
        inviteData,
        telegramId,
        timestamp: new Date().toISOString()
      });

      if (window.Telegram?.WebApp?.shareMessage) {
        await window.Telegram.WebApp.shareMessage(inviteData.messageId);
        console.log('✅ [StartScreen] Invite shared:', {
          messageId: inviteData.messageId,
          telegramId,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ [StartScreen] Failed to start game:', {
        error: error.message,
        telegramId,
        timestamp: new Date().toISOString()
      });
      setShowWaitModal(false);
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      alert(error.message || 'Failed to start game. Please try again.');
    }
  };

  const handleCancelLobby = async () => {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    if (!telegramId) {
      setShowWaitModal(false);
      return;
    }

    try {
      console.log('🔄 [StartScreen] Canceling lobby:', {
        telegramId,
        timestamp: new Date().toISOString()
      });

      const socket = initSocket();
      
      socket.once('lobbyDeleted', () => {
        console.log('✅ [StartScreen] Lobby deleted:', {
          telegramId,
          timestamp: new Date().toISOString()
        });
        setShowWaitModal(false);
        if (socket.connected) {
          socket.disconnect();
        }
      });

      socket.emit('cancelLobby', {
        telegramId: telegramId.toString()
      });

    } catch (error) {
      console.error('❌ [StartScreen] Failed to cancel lobby:', {
        error: error.message,
        telegramId,
        timestamp: new Date().toISOString()
      });
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
      {showWaitModal && <WaitModal 
        onCancel={handleCancelLobby}
        creatorMarker={creatorMarker}
      />}
      <div className="top-logo">
        <img src={logoIcon} width={128} alt="Logo" />
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
