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
  checkAndRestoreGameState,
  sendPlayerInfo
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
  const [playerInfo, setPlayerInfo] = useState({
    creator: {
      avatar: null,
      name: null
    },
    opponent: {
      avatar: null,
      name: null
    }
  });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  useEffect(() => {
    if (!mountedRef.current || !lobbyId) {
      return;
    }

    const socket = window.socket;
    if (!socket) {
      console.error('❌ [Game] No socket instance found');
      navigate('/loss', { 
        state: { 
          type: 'losst2',
          message: 'Connection lost. Please try again.',
          redirectTo: '/start'
        } 
      });
      return;
    }

    const handleConnect = () => {
      console.log('✅ [Game] Socket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    const handleDisconnect = () => {
      console.log('❌ [Game] Socket disconnected');
      setIsConnected(false);
      handleReconnect();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    initializeSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [lobbyId, navigate]);

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

  // Отправляем информацию о текущем игроке при инициализации игры
  useEffect(() => {
    if (gameSession?.id && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      sendPlayerInfo(gameSession.id, {
        id: user.id.toString(),
        name: user.first_name,
        avatar: user.photo_url
      });
    }
  }, [gameSession?.id]);

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

  const handleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('❌ [Game] Max reconnection attempts reached');
      navigate('/loss', { 
        state: { 
          type: 'losst2',
          message: 'Connection lost. Please try again.',
          redirectTo: '/start'
        } 
      });
      return;
    }

    const socket = window.socket;
    if (!socket) {
      console.error('❌ [Game] No socket instance found');
      navigate('/loss', { 
        state: { 
          type: 'losst2',
          message: 'Connection lost. Please try again.',
          redirectTo: '/start'
        } 
      });
      return;
    }

    if (socket.connected) {
      console.log('✅ [Game] Socket already connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      return;
    }

    console.log('🔄 [Game] Attempting to reconnect:', {
      attempt: reconnectAttempts + 1,
      maxAttempts: maxReconnectAttempts,
      timestamp: new Date().toISOString()
    });

    setReconnectAttempts(prev => prev + 1);
    socket.connect();
  };

  const initializeSocket = async () => {
    try {
      const socket = window.socket;
      if (!socket) {
        console.error('❌ [Game] No socket instance found');
        navigate('/loss', { 
          state: { 
            type: 'losst2',
            message: 'Connection lost. Please try again.',
            redirectTo: '/start'
          } 
        });
        return;
      }

      if (!socket.connected) {
        console.error('❌ [Game] Socket not connected');
        navigate('/loss', { 
          state: { 
            type: 'losst2',
            message: 'Connection lost. Please try again.',
            redirectTo: '/start'
          } 
        });
        return;
      }

      socketRef.current = socket;

      socket.on('gameState', (state) => {
        if (!mountedRef.current) return;
        if (!isValidGameState(state)) {
          console.error('❌ [Game] Invalid game state received:', state);
          return;
        }
        setBoard(state.board);
        setCurrentPlayer(state.currentPlayer);
        setScale(state.scale);
        setPosition(state.position);
        if (state.time) setTime(state.time);
        if (state.playerTime1) setPlayerTime1(state.playerTime1);
        if (state.playerTime2) setPlayerTime2(state.playerTime2);
        if (state.gameSession) setGameSession(state.gameSession);
      });

      socket.on('playerInfo', (info) => {
        if (!mountedRef.current) return;
        setPlayerInfo(info);
      });

      socket.on('opponentInfo', (info) => {
        if (!mountedRef.current) return;
        setOpponentInfo(info);
      });

      socket.on('gameOver', (result) => {
        if (!mountedRef.current) return;
        if (result.winner) {
          setWinLine(result.winLine);
        }
        navigate('/result', { state: result });
      });

      socket.emit('joinGame', { lobbyId });

    } catch (error) {
      console.error('❌ [Game] Error initializing socket:', error);
      navigate('/loss', { 
        state: { 
          type: 'losst2',
          message: 'Connection lost. Please try again.',
          redirectTo: '/start'
        } 
      });
    }
  };

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
      <GameHeader 
        currentPlayer={currentPlayer} 
        moveTimer={moveTimer} 
        time={time}
        playerTime1={playerTime1}
        playerTime2={playerTime2}
        opponentInfo={opponentInfo}
        isConnected={isConnected}
        isCreator={gameSession?.creatorId === window.Telegram?.WebApp?.initDataUnsafe?.user?.id}
        playerInfo={playerInfo}
      />

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