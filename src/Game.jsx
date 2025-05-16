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
  subscribeToGameEvents 
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

  const [board, setBoard] = useState(() => {
    const savedState = loadGameState();
    return savedState?.board || createEmptyBoard();
  });
  const [currentPlayer, setCurrentPlayer] = useState(() => {
    const savedState = loadGameState();
    return savedState?.currentPlayer || "O";
  });
  const [winLine, setWinLine] = useState(null);
  const [scale, setScale] = useState(() => {
    const savedState = loadGameState();
    return savedState?.scale || 1;
  });
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
  const [gameSession, setGameSession] = useState(() => {
    const savedState = loadGameState();
    return savedState?.gameSession || null;
  });
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

  // Обновляем эффект с подключением к WebSocket
  useEffect(() => {
    if (!mountedRef.current) {
      console.log('⏭️ Skipping socket initialization - component not mounted');
      return;
    }

    const socket = initSocket();
    console.log('🔌 Socket initialization', {
      socketId: socket?.id,
      connected: socket?.connected,
      timestamp: new Date().toISOString()
    });

    const connect = () => {
      if (!socket) {
        console.warn('⚠️ Socket not initialized in connect()');
        return;
      }
      
      connectSocket();

      socket.on('connect', () => {
        console.log('✅ Socket connected', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        setIsConnected(true);
        setReconnectAttempts(0);
        
        if (gameSession?.id) {
          console.log('🔄 Requesting game state', {
            gameId: gameSession.id,
            timestamp: new Date().toISOString()
          });
          socket.emit('requestGameState', {
            gameId: gameSession.id,
            telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
          });
        }
      });

      socket.on('gameState', (data) => {
        console.log('📥 Received game state', {
          valid: isValidGameState(data),
          data: {
            currentPlayer: data?.currentPlayer,
            gameSessionId: data?.gameSession?.id,
            boardSize: data?.board?.length
          },
          timestamp: new Date().toISOString()
        });
        if (!data || !isValidGameState(data)) {
          console.error('Received invalid game state from server');
          return;
        }

        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setPlayerTime1(data.playerTime1);
        setPlayerTime2(data.playerTime2);
        setGameSession(data.gameSession);
        setMoveStartTime(Date.now());
        
        saveGameState(data);
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
        
        // Проверяем reconnectAttempts перед использованием
        const currentAttempts = reconnectAttempts || 0;
        if (currentAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => (prev || 0) + 1);
            connect();
          }, reconnectDelay * (currentAttempts + 1));
        } else {
          alert('Не удалось подключиться к серверу. Пожалуйста, обновите страницу.');
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from game server');
        setIsConnected(false);
      });
    };

    connect();

    // Подписываемся на события игры
    const unsubscribe = subscribeToGameEvents({
      onGameStart: (data) => {
        if (!data?.session) {
          console.error('Invalid game start data received');
          return;
        }

        const gameState = {
          session: data.session,
          startTime: Date.now(),
          board: data.session.board || createEmptyBoard(),
          currentPlayer: data.session.currentTurn,
          playerTime1: data.session.playerTime1 || 0,
          playerTime2: data.session.playerTime2 || 0
        };
        
        setGameSession(gameState.session);
        setGameStartTime(gameState.startTime);
        setMoveStartTime(gameState.startTime);
        setPlayerTime1(gameState.playerTime1);
        setPlayerTime2(gameState.playerTime2);
        setBoard(gameState.board);
        setCurrentPlayer(gameState.currentPlayer);
        
        saveGameState(gameState);
      },

      onOpponentJoined: (data) => {
        if (!data?.opponentId) {
          console.error('Invalid opponent data received');
          return;
        }

        setOpponentInfo({
          id: data.opponentId,
          name: data.opponentName || 'Opponent',
          avatar: data.opponentAvatar
        });
      },

      onMoveMade: (data) => {
        if (!data?.position || !data?.gameState) {
          console.error('Invalid move data received');
          return;
        }

        const { position, player, gameState } = data;
        const { 
          currentTurn, 
          playerTime1, 
          playerTime2, 
          serverTime,
          moveStartTime,
          gameStartTime
        } = gameState;

        // Проверяем наличие всех необходимых данных
        if (!currentTurn || !serverTime || !moveStartTime) {
          console.error('Missing required game state data');
          return;
        }

        let row = position.row;
        let col = position.col;

        if (position.normalizedX !== undefined && position.normalizedY !== undefined) {
          // Проверяем наличие размеров доски
          if (!boardDimensions?.width || !boardDimensions?.height) {
            console.error('Board dimensions not initialized');
            return;
          }

          const denormalized = denormalizeCoordinates(
            position.normalizedX,
            position.normalizedY,
            boardDimensions.width,
            boardDimensions.height
          );
          
          row = Math.floor(denormalized.y / CELL_SIZE);
          col = Math.floor(denormalized.x / CELL_SIZE);
        }

        setBoard(prevBoard => {
          if (!prevBoard) return createEmptyBoard();
          const newBoard = prevBoard.map(row => [...row]);
          if (newBoard[row] && typeof col !== 'undefined') {
            newBoard[row][col] = player;
          }
          return newBoard;
        });

        const timeOffset = Date.now() - serverTime;
        setCurrentPlayer(currentTurn);
        setPlayerTime1(playerTime1 || 0);
        setPlayerTime2(playerTime2 || 0);
        setMoveStartTime(moveStartTime + timeOffset);
        
        if (gameStartTime && (!gameSession?.startedAt || gameStartTime !== gameSession.startedAt)) {
          setGameStartTime(gameStartTime + timeOffset);
        }

        setMoveTimer(2400);

        if (socket && gameSession?.id) {
          socket.emit('moveReceived', { 
            gameId: gameSession.id, 
            moveId: data.moveId 
          });
        }
      },

      onTimeUpdated: (data) => {
        setPlayerTime1(data.playerTime1);
        setPlayerTime2(data.playerTime2);
      },

      onViewportUpdated: (data) => {
        if (data.telegramId !== socket.telegramId) {
          setScale(data.viewport.scale);
          setPosition(data.viewport.position);
        }
      },

      onPlayerDisconnected: (data) => {
        console.log(`Player ${data.telegramId} disconnected`);
        // Показываем уведомление об отключении оппонента
        if (opponentInfo?.id === data.telegramId) {
          alert('Оппонент отключился. Ожидаем переподключения...');
        }
      },

      onPlayerReconnected: (data) => {
        console.log(`Player ${data.telegramId} reconnected`);
        if (opponentInfo?.id === data.telegramId) {
          alert('Оппонент вернулся в игру');
        }
      },

      onGameEnded: (data) => {
        const { winner, reason } = data;
        setWinLine(data.finalBoard ? checkWinner(data.finalBoard, 0, 0, winner) : null);
        
        localStorage.removeItem('gameState');
        
        setTimeout(() => {
          navigate(winner === socket.telegramId ? "/end" : "/lost", {
            replace: true,
            state: { 
              time,
              statistics: data.statistics
            }
          });
        }, 1500);
      }
    });

    return () => {
      if (!mountedRef.current) {
        console.log('⏭️ Skipping socket cleanup - component not mounted');
        return;
      }
      console.log('🔌 Cleaning up socket connections', {
        socketId: socket?.id,
        timestamp: new Date().toISOString()
      });
      socket.off('gameState');
      unsubscribe();
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, [navigate, time, reconnectAttempts, gameSession, boardDimensions]);

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

  // Определяем, является ли текущий ход нашим
  const isOurTurn = currentPlayer === (gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "X" : "O");

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
      console.log('📱 Single touch start', {
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
    if (currentPlayer !== (gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "X" : "O")) return;
    
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
