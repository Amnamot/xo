// Game.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Game.css";
import "./Shape.css";
import Shape from "./Shape";
import GameHeader from "./components/GameHeader";
import { 
  initSocket,
  connectSocket, 
  makeMove, 
  updatePlayerTime, 
  updateViewport,
  subscribeToGameEvents,
  checkAndRestoreGameState
} from "./services/socket";

const BOARD_SIZE = 100;
const WIN_CONDITION = 5;
const CELL_SIZE_DESKTOP = 60;
const CELL_SIZE_MOBILE = 40;
const INITIAL_POSITION = Math.floor(BOARD_SIZE / 2);

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const isValidGameState = (gameState) => {
  if (!gameState || typeof gameState !== 'object') return false;
  
  // Проверяем обязательные поля
  const requiredFields = ['board', 'currentPlayer', 'scale', 'position'];
  if (!requiredFields.every(field => field in gameState)) return false;
  
  // Проверяем board
  if (!Array.isArray(gameState.board) || 
      gameState.board.length !== BOARD_SIZE || 
      !gameState.board.every(row => 
        Array.isArray(row) && 
        row.length === BOARD_SIZE && 
        row.every(cell => cell === null || cell === 'X' || cell === 'O')
      )) {
    return false;
  }
  
  // Проверяем currentPlayer
  if (gameState.currentPlayer !== 'X' && gameState.currentPlayer !== 'O') return false;
  
  // Проверяем scale
  if (typeof gameState.scale !== 'number' || gameState.scale <= 0) return false;
  
  // Проверяем position
  if (!gameState.position || 
      typeof gameState.position.x !== 'number' || 
      typeof gameState.position.y !== 'number') {
    return false;
  }
  
  // Проверяем опциональные числовые поля
  const optionalNumberFields = ['time', 'playerTime1', 'playerTime2'];
  for (const field of optionalNumberFields) {
    if (field in gameState && typeof gameState[field] !== 'number') return false;
  }
  
  // Проверяем gameSession если он есть
  if (gameState.gameSession) {
    const sessionFields = ['id', 'creatorId', 'opponentId'];
    if (!sessionFields.every(field => typeof gameState.gameSession[field] === 'string')) {
      return false;
    }
  }
  
  return true;
};

const checkWinner = (board, row, col, player) => {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    let start = [row, col];
    let end = [row, col];

    for (let step = 1; step < WIN_CONDITION; step++) {
      const x = row + dx * step;
      const y = col + dy * step;
      if (board[x]?.[y] === player) {
        count++;
        end = [x, y];
      } else break;
    }
    for (let step = 1; step < WIN_CONDITION; step++) {
      const x = row - dx * step;
      const y = col - dy * step;
      if (board[x]?.[y] === player) {
        count++;
        start = [x, y];
      } else break;
    }
    if (count >= WIN_CONDITION) return { player, start, end };
  }
  return null;
};

const getVisibleCells = (board) => {
  const visibleCells = new Set();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row] && board[row][col]) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const x = row + dx;
            const y = col + dy;
            if (board[x]?.[y] === null) {
              visibleCells.add(`${x}-${y}`);
            }
          }
        }
      }
    }
  }
  return visibleCells;
};

// Функции нормализации координат
const normalizeCoordinates = (x, y, boardWidth, boardHeight) => {
  // Преобразуем координаты в проценты от размера поля
  return {
    normalizedX: x / boardWidth,
    normalizedY: y / boardHeight
  };
};

const denormalizeCoordinates = (normalizedX, normalizedY, boardWidth, boardHeight) => {
  // Преобразуем нормализованные координаты обратно в пиксели
  return {
    x: Math.floor(normalizedX * boardWidth),
    y: Math.floor(normalizedY * boardHeight)
  };
};

const calculateBoardDimensions = (cellSize) => {
  return {
    width: BOARD_SIZE * cellSize,
    height: BOARD_SIZE * cellSize
  };
};

const Game = () => {
  const navigate = useNavigate();
  const { lobbyId } = useParams();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState("O");
  const [winLine, setWinLine] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState(null);
  const [initialDistance, setInitialDistance] = useState(null);
  const [moveStartTime, setMoveStartTime] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveTimer, setMoveTimer] = useState(0);
  const [time, setTime] = useState(0);
  const [playerTime1, setPlayerTime1] = useState(0);
  const [playerTime2, setPlayerTime2] = useState(0);
  const [gameSession, setGameSession] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;
  const socketRef = useRef(null);
  const boardRef = useRef(null);
  const [boardDimensions, setBoardDimensions] = useState({ width: 0, height: 0 });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  useEffect(() => {
    if (!mountedRef.current || !lobbyId) {
      return;
    }

    const initializeSocket = async () => {
      try {
        console.log('🔌 [Game] Initializing socket connection:', {
          lobbyId,
          telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString(),
          timestamp: new Date().toISOString()
        });

        const socket = initSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔌 [Game] Socket connected:', {
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
          setIsConnected(true);
          setReconnectAttempts(0);
        });

        socket.on('disconnect', () => {
          console.log('🔌 [Game] Socket disconnected:', {
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
          setIsConnected(false);
          handleReconnect();
        });

        socket.on('gameStart', (data) => {
          console.log('🎮 [Game] Game started:', {
            startTime: data.startTime,
            gameId: data.gameId,
            playerInfo: data.playerInfo,
            timestamp: new Date().toISOString()
          });
          
          setGameStartTime(data.startTime);
          setMoveStartTime(data.startTime);
          setOpponentInfo(data.playerInfo);
        });

        socket.on('gameState', (gameState) => {
          console.log('[DEBUG][FRONT][SOCKET_GAMESTATE_DETAILED]', {
            socketId: socket.id,
            gameState,
            isValid: isValidGameState(gameState),
            validationDetails: {
              hasBoard: !!gameState?.board,
              hasCurrentPlayer: !!gameState?.currentPlayer,
              hasScale: !!gameState?.scale,
              hasPosition: !!gameState?.position,
              boardType: gameState?.board ? typeof gameState.board : 'undefined',
              currentPlayerType: gameState?.currentPlayer ? typeof gameState.currentPlayer : 'undefined',
              scaleType: gameState?.scale ? typeof gameState.scale : 'undefined',
              positionType: gameState?.position ? typeof gameState.position : 'undefined'
            },
            timestamp: new Date().toISOString()
          });

          if (!isValidGameState(gameState)) {
            console.error('❌ [Game] Invalid game state received:', {
              gameState,
              validationDetails: {
                hasBoard: !!gameState?.board,
                hasCurrentPlayer: !!gameState?.currentPlayer,
                hasScale: !!gameState?.scale,
                hasPosition: !!gameState?.position
              },
              timestamp: new Date().toISOString()
            });
            return;
          }

          setBoard(gameState.board);
          setCurrentPlayer(gameState.currentPlayer);
          setScale(gameState.scale);
          setPosition(gameState.position);
          setTime(gameState.time || 0);
          setPlayerTime1(gameState.playerTime1 || 0);
          setPlayerTime2(gameState.playerTime2 || 0);
          setGameSession(gameState.gameSession);
          
          // Добавляем проверку типов
          if (gameState.gameSession) {
            console.log('[DEBUG][FRONT][TYPES]', {
              creatorId: gameState.gameSession.creatorId,
              creatorIdType: typeof gameState.gameSession.creatorId,
              userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
              userIdType: typeof window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
              isCreator: String(gameState.gameSession.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
              timestamp: new Date().toISOString()
            });
          }
          
          // Проверяем, есть ли уже данные о сопернике
          if (!opponentInfo && gameState.opponentInfo) {
            setOpponentInfo(gameState.opponentInfo);
          }
          
          setMoveTimer(gameState.maxMoveTime || 30000);
          
          if (gameState.startTime) {
            setGameStartTime(gameState.startTime);
            setMoveStartTime(gameState.startTime);
          }
        });

        socket.on('moveMade', (data) => {
          console.log('🎲 [Game] Move made:', {
            moveId: data.moveId,
            position: data.position,
            player: data.player,
            gameState: {
              board: data.gameState.board,
              currentTurn: data.gameState.currentTurn,
              timeLeft: data.gameState.timeLeft
            },
            timestamp: new Date().toISOString()
          });

          setBoard(data.gameState.board);
          setCurrentPlayer(data.gameState.currentTurn);
          setMoveStartTime(data.gameState.moveStartTime);
          setMoveTimer(30000);

          const winner = checkWinner(
            data.gameState.board,
            Number(data.position),
            data.player
          );

          if (winner) {
            console.log('🏆 [Game] Winner found:', {
              winner,
              lastMove: {
                position: data.position,
                player: data.player
              },
              timestamp: new Date().toISOString()
            });
            setWinLine(winner);
          }
        });

        socket.on('playerDisconnected', (data) => {
          console.log('👋 [Game] Player disconnected:', {
            telegramId: data.telegramId,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('gameEnded', (data) => {
          console.log('🏁 [Game] Game ended:', {
            winner: data.winner,
            reason: data.reason,
            statistics: data.statistics,
            timestamp: new Date().toISOString()
          });

          const currentTelegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
          if (data.winner === currentTelegramId) {
            navigate('/end');
          } else {
            navigate('/lost');
          }
        });

        // Подписываемся на игровые события
        subscribeToGameEvents(socket, {
          onGameState: (gameState) => {
            if (!isValidGameState(gameState)) {
              console.error('❌ [Game] Invalid game state received:', {
                gameState,
                timestamp: new Date().toISOString()
              });
              return;
            }

            console.log('🎮 [Game] Received game state:', {
              currentPlayer: gameState.currentPlayer,
              scale: gameState.scale,
              position: gameState.position,
              timestamp: new Date().toISOString()
            });

            setBoard(gameState.board);
            setCurrentPlayer(gameState.currentPlayer);
            setScale(gameState.scale);
            setPosition(gameState.position);
            setTime(gameState.time);
            setPlayerTime1(gameState.playerTime1);
            setPlayerTime2(gameState.playerTime2);
            
            if (gameState.gameSession) {
              setGameSession(gameState.gameSession);
              if (gameState.gameSession.creatorId !== String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id)) {
                setOpponentInfo({
                  id: gameState.gameSession.creatorId,
                  name: gameState.gameSession.creatorName,
                  avatar: gameState.gameSession.creatorAvatar
                });
              }
            }

            if (gameStartTime === null) {
              setGameStartTime(Date.now() - (gameState.time * 1000));
              setMoveStartTime(Date.now());
            }
          },
          onOpponentJoined: (opponent) => {
            setOpponentInfo(opponent);
          },
          onOpponentLeft: () => {
            setOpponentInfo(null);
          },
          onError: (error) => {
            console.error('Game error:', error);
          }
        });

        // Проверяем сохраненное состояние после подключения
        try {
          const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 
                            localStorage.getItem('current_telegram_id');
          if (telegramId) {
            const gameState = await checkAndRestoreGameState(telegramId);
            if (gameState?.gameId && gameState.gameId !== lobbyId) {
              console.log('🔄 [Game] Found different active game:', {
                currentLobby: lobbyId,
                savedGame: gameState.gameId,
                timestamp: new Date().toISOString()
              });
              navigate(`/game/${gameState.gameId}`);
            }
          }
        } catch (error) {
          console.warn('⚠️ [Game] Failed to check game state:', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error during socket initialization:', error);
        handleReconnect();
      }
    };

    const handleReconnect = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        navigate('/');
        return;
      }

      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        initializeSocket();
      }, reconnectDelay);
    };

    initializeSocket();

    return () => {
      // Не отключаем сокет при размонтировании компонента
      // Только очищаем обработчики событий
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('moveMade');
        socketRef.current.off('playerDisconnected');
        socketRef.current.off('gameEnded');
        socketRef.current.off('gameState');
      }
    };
  }, [lobbyId, navigate, reconnectAttempts]);

  // Обновляем viewport при изменении масштаба или позиции
  useEffect(() => {
    if (gameSession) {
      updateViewport(gameSession.id, { scale, position });
    }
  }, [scale, position, gameSession]);

  // Эффект для таймера хода и времени игроков
  useEffect(() => {
    if (moveStartTime === null || !isConnected) return;

    const moveInterval = setInterval(() => {
      const elapsed = Date.now() - moveStartTime;
      const newMoveTimer = Math.max(30000 - Math.floor(elapsed / 10), 0);
      setMoveTimer(newMoveTimer);
      
      // Обновляем время только активного игрока
      if (currentPlayer === "X") {
        setPlayerTime1(prev => prev + 100);
      } else {
        setPlayerTime2(prev => prev + 100);
      }
    }, 100);

    return () => clearInterval(moveInterval);
  }, [moveStartTime, currentPlayer, isConnected]);

  // Эффект для общего времени игры
  useEffect(() => {
    if (gameStartTime === null || !isConnected) return;

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
      setTime(elapsedSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, isConnected]);

  // Определяем, является ли текущий ход нашим
  const isOurTurn = currentPlayer === (String(gameSession?.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id) ? "X" : "O");

  useEffect(() => {
    const socket = initSocket();
    if (moveTimer === 0 && isOurTurn) {
      socket.emit('timeExpired', {
        gameId: gameSession?.id,
        player: currentPlayer
      });
    }
  }, [moveTimer, isOurTurn, gameSession?.id, currentPlayer]);

  // Обновляем размеры доски при изменении размера окна
  useEffect(() => {
    const updateBoardDimensions = () => {
      if (boardRef.current) {
        const cellSize = window.innerWidth < 768 ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;
        const dimensions = calculateBoardDimensions(cellSize);
        setBoardDimensions(dimensions);
      }
    };

    updateBoardDimensions();
    window.addEventListener('resize', updateBoardDimensions);

    return () => {
      window.removeEventListener('resize', updateBoardDimensions);
    };
  }, []);

  const handleTouchStart = (e) => {
    console.log('👆 Touch start event', {
      isOurTurn,
      touchCount: e?.touches?.length,
      timestamp: new Date().toISOString()
    });

    if (!isOurTurn) return;
    
    if (e?.touches?.length === 1) {
      const newTouchStart = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
      console.log('👆 Single touch start', {
        position,
        newTouchStart,
        timestamp: new Date().toISOString()
      });
      setTouchStart(newTouchStart);
    } else if (e?.touches?.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log('📱 Double touch start', {
        distance,
        timestamp: new Date().toISOString()
      });
      setInitialDistance(distance);
    }
  };

  const handleTouchMove = (e) => {
    console.log('👆 Touch move event', {
      isOurTurn,
      touchCount: e?.touches?.length,
      touchStart: !!touchStart,
      initialDistance: !!initialDistance,
      timestamp: new Date().toISOString()
    });

    if (!isOurTurn || !e?.touches) return;

    try {
      if (e.touches.length === 1) {
        if (!touchStart) {
          console.warn('⚠️ Touch move without touchStart');
          return;
        }
        
        const newPosition = {
          x: e.touches[0].clientX - touchStart.x,
          y: e.touches[0].clientY - touchStart.y,
        };
        console.log('📱 Moving board', {
          from: position,
          to: newPosition,
          timestamp: new Date().toISOString()
        });
        setPosition(newPosition);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (!initialDistance) {
          console.log('📏 Setting initial distance', {
            distance: newDistance,
            timestamp: new Date().toISOString()
          });
          setInitialDistance(newDistance);
          return;
        }
        
        const zoom = newDistance / initialDistance;
        console.log('🔍 Zooming board', {
          currentScale: scale,
          zoom,
          newDistance,
          initialDistance,
          timestamp: new Date().toISOString()
        });
        setScale((prev) => Math.min(Math.max(prev * zoom, 0.5), 2));
        setInitialDistance(newDistance);
      }
    } catch (error) {
      console.error('❌ Error in handleTouchMove:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleTouchEnd = () => {
    console.log('👆 Touch end event', {
      hadTouchStart: !!touchStart,
      hadInitialDistance: !!initialDistance,
      timestamp: new Date().toISOString()
    });
    setTouchStart(null);
    setInitialDistance(null);
  };

  const visibleCells = board.length ? getVisibleCells(board) : new Set();

  const handleCellClick = async (row, col) => {
    if (!visibleCells.has(`${row}-${col}`) || winLine || !gameSession) return;
    if (currentPlayer !== (String(gameSession?.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id) ? "X" : "O")) return;
    
    const moveTime = Date.now() - moveStartTime;
    
    const { normalizedX, normalizedY } = normalizeCoordinates(
      col * CELL_SIZE,
      row * CELL_SIZE,
      boardDimensions.width,
      boardDimensions.height
    );
    
    try {
      await makeMove(
        gameSession.id,
        { 
          row,
          col,
          normalizedX,
          normalizedY
        },
        currentPlayer,
        moveTime
      );
    } catch (error) {
      console.error('Failed to make move:', error);
    }
  };

  const calculateWinLineStyle = () => {
    if (!winLine) return {};
    const { start, end } = winLine;
    const startX = (start[1] + 0.5) * CELL_SIZE;
    const startY = (start[0] + 0.5) * CELL_SIZE;
    const deltaX = (end[1] - start[1]) * CELL_SIZE;
    const deltaY = (end[0] - start[0]) * CELL_SIZE;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    return {
      top: `${startY}px`,
      left: `${startX}px`,
      width: `${length}px`,
      transform: `translateY(-50%) rotate(${angle}deg)`
    };
  };

  useEffect(() => {
    const socket = initSocket();
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (!telegramId) return;

    socket.emit('getOpponentInfo', { telegramId }, (response) => {
      console.log('[DEBUG][FRONT][SOCKET getOpponentInfo]', { response, telegramId, timestamp: new Date().toISOString() });
      if (response && !response.error) {
        setOpponentInfo({
          name: response.name,
          avatar: response.avatar
        });
        console.log('🟢 [Game] Opponent info received:', response);
      } else {
        console.warn('⚠️ [Game] Failed to get opponent info:', response);
      }
    });
  }, []);

  // Логирование после получения gameSession
  useEffect(() => {
    if (gameSession) {
      console.log('[DEBUG][FRONT][SESSION]', {
        gameSession,
        isCreator: String(gameSession?.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
        telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [gameSession]);

  // Логирование после получения opponentInfo
  useEffect(() => {
    if (opponentInfo) {
      console.log('[DEBUG][FRONT][OPPONENT]', {
        opponentInfo,
        timestamp: new Date().toISOString()
      });
    }
  }, [opponentInfo]);

  useEffect(() => {
    if (gameSession) {
      console.log('[DEBUG][FRONT][INITDATA]', {
        rawInitData: window.Telegram?.WebApp?.initData,
        parsedInitData: window.Telegram?.WebApp?.initDataUnsafe,
        userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        userIdType: typeof window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [gameSession]);

  useEffect(() => {
    if (!socketRef.current) return;
    console.log('[DEBUG][FRONT][SOCKET][ATTACH_GAMESTATE]', { socketId: socketRef.current.id, timestamp: new Date().toISOString() });
    const handler = (gameState) => {
      console.log('[DEBUG][FRONT][SOCKET][ON_GAMESTATE]', { socketId: socketRef.current.id, gameState, timestamp: new Date().toISOString() });
      setGameSession(gameState.gameSession);
      // ...другой стейт
    };
    socketRef.current.on('gameState', handler);
    return () => socketRef.current.off('gameState', handler);
  }, [socketRef]);

  return (
    <div
      className="game-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        cursor: isOurTurn ? 'default' : 'not-allowed',
        pointerEvents: isOurTurn ? 'auto' : 'none'
      }}
    >
      {gameSession && console.log('[DEBUG][FRONT][COMPARISON_DETAILED]', {
        creatorId: gameSession.creatorId,
        creatorIdType: typeof gameSession.creatorId,
        creatorIdAsString: String(gameSession.creatorId),
        userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        userIdType: typeof window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        userIdAsString: String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
        comparison: String(gameSession.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
        comparisonResult: {
          direct: gameSession.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
          stringCompare: String(gameSession.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
          numberCompare: Number(gameSession.creatorId) === Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id)
        },
        timestamp: new Date().toISOString()
      })}
      <GameHeader 
        gameSession={gameSession}
        currentPlayer={currentPlayer}
        onExit={() => navigate('/')}
      />
      {gameSession && (
        <pre style={{color: 'red', fontSize: 12}}>
          {JSON.stringify({
            creatorId: gameSession.creatorId,
            creatorIdType: typeof gameSession.creatorId,
            userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
            userIdType: typeof window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
            isCreator: String(gameSession.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id)
          }, null, 2)}
        </pre>
      )}
      <div
        ref={boardRef}
        className="board-grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          width: boardDimensions.width,
          height: boardDimensions.height,
          opacity: isOurTurn ? 1 : 0.7
        }}
      >
        {board.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`cell ${visibleCells.has(`${i}-${j}`) ? "cell-available" : "cell-blocked"}`}
              onClick={() => handleCellClick(i, j)}
              style={{ width: CELL_SIZE, height: CELL_SIZE }}
            >
              {cell && <Shape type={cell} />}
            </div>
          ))
        )}
        {winLine && (
          <div className="win-line" style={calculateWinLineStyle()} />
        )}
      </div>
    </div>
  );
};

export default Game;