// Game.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
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
  waitForSocket 
} from "./services/socket";

const BOARD_SIZE = 100;
const WIN_CONDITION = 5;
const CELL_SIZE_DESKTOP = 60;
const CELL_SIZE_MOBILE = 40;
const INITIAL_POSITION = Math.floor(BOARD_SIZE / 2);

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

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

// Функции для работы с localStorage
const saveGameState = (state) => {
  try {
    localStorage.setItem('gameState', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
};

const isValidGameState = (state) => {
  if (!state || typeof state !== 'object') return false;

  // Проверка основных полей
  const requiredFields = {
    board: Array.isArray,
    currentPlayer: (val) => typeof val === 'string' && ['X', 'O'].includes(val),
    scale: (val) => typeof val === 'number' && val > 0,
    position: (val) => val && typeof val.x === 'number' && typeof val.y === 'number',
    time: (val) => typeof val === 'number' && val >= 0,
    playerTime1: (val) => typeof val === 'number' && val >= 0,
    playerTime2: (val) => typeof val === 'number' && val >= 0
  };

  for (const [field, validator] of Object.entries(requiredFields)) {
    if (!validator(state[field])) {
      console.error(`Invalid game state: ${field} is invalid`);
      return false;
    }
  }

  // Проверка структуры доски
  if (!state.board.every(row => 
    Array.isArray(row) && 
    row.length === BOARD_SIZE && 
    row.every(cell => cell === null || cell === 'X' || cell === 'O')
  )) {
    console.error('Invalid game state: board structure is invalid');
    return false;
  }

  // Проверка игровой сессии
  if (state.gameSession) {
    if (!state.gameSession.id || typeof state.gameSession.id !== 'string') {
      console.error('Invalid game state: gameSession.id is invalid');
      return false;
    }
  }

  return true;
};

const loadGameState = () => {
  try {
    const savedState = localStorage.getItem('gameState');
    if (!savedState) return null;
    
    const state = JSON.parse(savedState);
    return isValidGameState(state) ? state : null;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
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
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const socketUnsubscribeRef = useRef(null);
  const initializationCompleteRef = useRef(false);
  
  console.log('🎮 Game component initialization', {
    lobbyId,
    timestamp: new Date().toISOString(),
    mounted: mountedRef.current
  });

  useEffect(() => {
    mountedRef.current = true;
    console.log('🔄 Game component mounted');
    
    return () => {
      console.log('👋 Game component unmounting');
      mountedRef.current = false;
    };
  }, []);

  // Базовое состояние
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState("O");
  const [winLine, setWinLine] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState(() => {
    const savedState = loadGameState();
    return savedState?.position || { x: 0, y: 0 };
  });
  const [touchStart, setTouchStart] = useState(null);
  const [initialDistance, setInitialDistance] = useState(null);
  const [moveStartTime, setMoveStartTime] = useState(() => {
    const savedState = loadGameState();
    return savedState?.moveStartTime || null;
  });
  const [gameStartTime, setGameStartTime] = useState(() => {
    const savedState = loadGameState();
    return savedState?.gameStartTime || null;
  });
  const [moveTimer, setMoveTimer] = useState(2400);
  const [time, setTime] = useState(() => {
    const savedState = loadGameState();
    return savedState?.time || 0;
  });
  const [playerTime1, setPlayerTime1] = useState(() => {
    const savedState = loadGameState();
    return savedState?.playerTime1 || 0;
  });
  const [playerTime2, setPlayerTime2] = useState(() => {
    const savedState = loadGameState();
    return savedState?.playerTime2 || 0;
  });
  const [gameSession, setGameSession] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState(() => {
    const savedState = loadGameState();
    return savedState?.opponentInfo || null;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;
  const boardRef = useRef(null);
  const [boardDimensions, setBoardDimensions] = useState({ width: 0, height: 0 });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  // Эффект для инициализации игры
  useEffect(() => {
    let isMounted = true;
    
    const initializeGame = async () => {
      try {
        console.log('🎮 Initializing game component', {
          lobbyId,
          timestamp: new Date().toISOString(),
          renderCount: ++renderCountRef.current,
          timeSinceLastRender: Date.now() - lastRenderTime.current
        });

        if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
          throw new Error('Telegram WebApp not initialized');
        }

        const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
        
        // Подключаемся к сокету и присоединяемся к лобби
        const gameData = await joinLobby(lobbyId, telegramId);
        
        if (!isMounted) return;

        console.log('✅ Game initialization successful', {
          gameData,
          timestamp: new Date().toISOString()
        });

        // Обновляем состояние игры
        setGameSession(gameData);
        setBoard(gameData.board || createEmptyBoard());
        setCurrentPlayer(gameData.currentPlayer || "O");
        setIsConnected(true);
        setIsLoading(false);
        
        // Подписываемся на события игры
        const unsubscribe = await subscribeToGameEvents({
          onOpponentJoined: (data) => {
            if (!isMounted) return;
            console.log('👥 Opponent joined:', data);
            setGameSession(prev => ({ ...prev, ...data }));
          },
          onMoveMade: (data) => {
            if (!isMounted) return;
            console.log('🎯 Move made:', data);
            setBoard(data.board);
            setCurrentPlayer(data.nextPlayer);
            if (data.winLine) {
              setWinLine(data.winLine);
            }
          },
          onTimeUpdated: (data) => {
            if (!isMounted) return;
            setGameSession(prev => ({
              ...prev,
              playerTimes: data.playerTimes
            }));
          },
          onViewportUpdated: (data) => {
            if (!isMounted) return;
            setGameSession(prev => ({
              ...prev,
              viewport: data.viewport
            }));
          },
          onPlayerStatus: (data) => {
            if (!isMounted) return;
            setGameSession(prev => ({
              ...prev,
              playerStatus: {
                ...prev.playerStatus,
                ...data
              }
            }));
          },
          onPlayerDisconnected: (data) => {
            if (!isMounted) return;
            console.log('🔌 Player disconnected:', data);
            setGameSession(prev => ({
              ...prev,
              playerStatus: {
                ...prev.playerStatus,
                [data.playerId]: 'disconnected'
              }
            }));
          },
          onPlayerReconnected: (data) => {
            if (!isMounted) return;
            console.log('🔌 Player reconnected:', data);
            setGameSession(prev => ({
              ...prev,
              playerStatus: {
                ...prev.playerStatus,
                [data.playerId]: 'connected'
              }
            }));
          },
          onGameEnded: (data) => {
            if (!isMounted) return;
            console.log('🏁 Game ended:', data);
            setGameSession(prev => ({
              ...prev,
              status: 'ended',
              winner: data.winner
            }));
            if (data.winLine) {
              setWinLine(data.winLine);
            }
          }
        });

        socketUnsubscribeRef.current = unsubscribe;
        initializationCompleteRef.current = true;

      } catch (error) {
        console.error('❌ Game initialization error:', error);
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    initializeGame();

    return () => {
      isMounted = false;
      if (socketUnsubscribeRef.current) {
        socketUnsubscribeRef.current();
      }
    };
  }, [lobbyId]);

  // Эффект для обновления времени
  useEffect(() => {
    if (!gameSession?.playerTimes || !isConnected) return;

    const interval = setInterval(() => {
      updatePlayerTime(gameSession.id, gameSession.playerTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameSession?.id, gameSession?.playerTimes, isConnected]);

  // Обработчик хода
  const handleMove = async (position) => {
    if (!gameSession || !isConnected) return;

    try {
      const moveTime = Date.now();
      await makeMove(gameSession.id, position, currentPlayer, moveTime);
    } catch (error) {
      console.error('Failed to make move:', error);
      setError('Failed to make move. Please try again.');
    }
  };

  // Обработчик изменения размера viewport
  const handleViewportChange = useCallback((viewport) => {
    if (!gameSession?.id || !isConnected) return;
    updateViewport(gameSession.id, viewport);
  }, [gameSession?.id, isConnected]);

  // Показываем загрузку
  if (isLoading) {
    return <div className="loading">Loading game...</div>;
  }

  // Показываем ошибку
  if (error) {
    return <div className="error">{error}</div>;
  }

  // Логирование каждого рендера
  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    console.log('🎨 Game component render', {
      renderCount: renderCountRef.current,
      timeSinceLastRender,
      timestamp: new Date().toISOString(),
      memoryUsage: window.performance?.memory ? {
        usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
        totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024)
      } : 'not available'
    });
  });

  // Логирование состояния игры
  useEffect(() => {
    console.log('🎮 Game state update', {
      timestamp: new Date().toISOString(),
      currentPlayer,
      isOurTurn: currentPlayer === (gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "X" : "O"),
      moveTimer,
      boardState: {
        totalCells: board.flat().length,
        filledCells: board.flat().filter(cell => cell !== null).length,
        visibleCells: board.length ? getVisibleCells(board).size : 0
      },
      gameSession: gameSession ? {
        id: gameSession.id,
        creatorId: gameSession.creatorId,
        startedAt: gameSession.startedAt
      } : null,
      connection: {
        isConnected,
        reconnectAttempts
      },
      timing: {
        gameTime: time,
        playerTime1,
        playerTime2,
        moveStartTime: moveStartTime ? new Date(moveStartTime).toISOString() : null
      }
    });
  }, [board, currentPlayer, moveTimer, gameSession, isConnected, time, playerTime1, playerTime2, moveStartTime]);

  // Сохраняем состояние при изменении важных данных
  useEffect(() => {
    if (!mountedRef.current) return;

    console.log('💾 Game state update', {
      board: board.length,
      currentPlayer,
      scale,
      position,
      moveStartTime: moveStartTime ? new Date(moveStartTime).toISOString() : null,
      gameStartTime: gameStartTime ? new Date(gameStartTime).toISOString() : null,
      time,
      playerTime1,
      playerTime2,
      gameSession: gameSession?.id,
      isConnected,
      timestamp: new Date().toISOString()
    });

    const gameState = {
      board,
      currentPlayer,
      scale,
      position,
      moveStartTime,
      gameStartTime,
      time,
      playerTime1,
      playerTime2,
      gameSession,
      opponentInfo
    };
    saveGameState(gameState);
  }, [
    board,
    currentPlayer,
    scale,
    position,
    moveStartTime,
    gameStartTime,
    time,
    playerTime1,
    playerTime2,
    gameSession,
    opponentInfo,
    isConnected
  ]);

  // При монтировании компонента проверяем сохраненное состояние
  useEffect(() => {
    const savedState = loadGameState();
    if (savedState?.gameSession) {
      // Переподключаемся к игровой сессии
      const socket = initSocket();
      socket.emit('joinGame', {
        gameId: savedState.gameSession.id,
        telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      });
    }
  }, []);

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
      setMoveTimer(Math.max(2400 - Math.floor(elapsed / 10), 0));
      
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

  // Эффект для проверки окончания времени хода
  useEffect(() => {
    if (!moveTimer || !isOurTurn || !gameSession?.id) return;

    const socket = initSocket();
    if (!socket) return;

    if (moveTimer === 0) {
      console.log('⏰ Move time expired', {
        gameId: gameSession.id,
        player: currentPlayer,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('timeExpired', {
        gameId: gameSession.id,
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

  // Определяем, является ли текущий ход нашим
  const isOurTurn = currentPlayer === (gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "X" : "O");

  // Отслеживание производительности обработки событий
  const logEventPerformance = (eventName, startTime) => {
    const duration = Date.now() - startTime;
    if (duration > 16) { // Логируем события, которые заняли больше одного кадра (16.67мс)
      console.warn(`⚠️ Slow ${eventName} event`, {
        duration,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Обновляем обработчики событий с логированием производительности
  const handleTouchStart = (e) => {
    const startTime = Date.now();
    console.log('👆 Touch start event', {
      isOurTurn,
      touchCount: e?.touches?.length,
      timestamp: new Date().toISOString()
    });

    if (!isOurTurn) return;
    
    try {
      if (e?.touches?.length === 1) {
        const newTouchStart = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        };
        setTouchStart(newTouchStart);
      } else if (e?.touches?.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        setInitialDistance(distance);
      }
    } catch (error) {
      console.error('❌ Error in handleTouchStart:', {
        error: error.stack,
        timestamp: new Date().toISOString()
      });
    } finally {
      logEventPerformance('touchStart', startTime);
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
    const startTime = Date.now();
    try {
      if (!visibleCells.has(`${row}-${col}`) || winLine || !gameSession) return;
      if (currentPlayer !== (gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "X" : "O")) return;
      
      console.log('🎯 Cell click', {
        row,
        col,
        currentPlayer,
        moveTime: Date.now() - moveStartTime,
        timestamp: new Date().toISOString()
      });
      
      const moveTime = Date.now() - moveStartTime;
      
      const { normalizedX, normalizedY } = normalizeCoordinates(
        col * CELL_SIZE,
        row * CELL_SIZE,
        boardDimensions.width,
        boardDimensions.height
      );
      
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
      console.error('❌ Error in handleCellClick:', {
        error: error.stack,
        row,
        col,
        timestamp: new Date().toISOString()
      });
    } finally {
      logEventPerformance('cellClick', startTime);
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

  return (
    <div
      className="game-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        cursor: isOurTurn ? 'default' : 'not-allowed',
        pointerEvents: isOurTurn ? 'auto' : 'none' // Полностью блокируем взаимодействие
      }}
    >
      <GameHeader 
        currentPlayer={currentPlayer} 
        moveTimer={moveTimer} 
        time={time}
        playerTime1={playerTime1}
        playerTime2={playerTime2}
        opponentAvatar={opponentInfo?.avatar}
        isConnected={isConnected}
      />

      <div
        ref={boardRef}
        className="board-grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          width: boardDimensions.width,
          height: boardDimensions.height,
          opacity: isOurTurn ? 1 : 0.7 // Визуально показываем, что поле неактивно
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
