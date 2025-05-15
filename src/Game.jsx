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
  waitForSocket,
  joinLobby 
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

// Функции для работы с состоянием игры
// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
const saveGameState = (state) => {
  try {
    localStorage.setItem('gameState', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
};

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
// eslint-disable-next-line no-unused-vars
const normalizeCoordinates = (x, y, boardWidth, boardHeight) => {
  // Преобразуем координаты в проценты от размера поля
  return {
    normalizedX: x / boardWidth,
    normalizedY: y / boardHeight
  };
};

// eslint-disable-next-line no-unused-vars
const denormalizeCoordinates = (normalizedX, normalizedY, boardWidth, boardHeight) => {
  // Преобразуем нормализованные координаты обратно в пиксели
  return {
    x: Math.floor(normalizedX * boardWidth),
    y: Math.floor(normalizedY * boardHeight)
  };
};

// eslint-disable-next-line no-unused-vars
const calculateBoardDimensions = (cellSize) => {
  return {
    width: BOARD_SIZE * cellSize,
    height: BOARD_SIZE * cellSize
  };
};

const Game = () => {
  const navigate = useNavigate();
  const { lobbyId } = useParams();
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const socketUnsubscribeRef = useRef(null);
  const initializationCompleteRef = useRef(false);
  const boardRef = useRef(null);

  // Все состояния объявляем в начале компонента
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState("O");
  const [gameSession, setGameSession] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [playerTimes, setPlayerTimes] = useState({ playerTime1: 0, playerTime2: 0 });
  const [cellSize, setCellSize] = useState(window.innerWidth <= 768 ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP);

  // Эффект для инициализации игры
  useEffect(() => {
    let isMounted = true;
    let retryTimeout = null;

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
        setIsLoading(false);
        initializationCompleteRef.current = true;

      } catch (error) {
        console.error('❌ Game initialization failed:', error);
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    initializeGame();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [lobbyId]);

  // Эффект для подписки на события сокета
  useEffect(() => {
    if (!gameSession?.id) return;

    const unsubscribe = subscribeToGameEvents({
      onMoveMade: handleMoveMade,
      onTimeUpdated: handleTimeUpdate,
      onPlayerDisconnected: handlePlayerDisconnect,
      onPlayerReconnected: handlePlayerReconnect,
      onGameEnded: handleGameEnd
    });

    socketUnsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    gameSession?.id,
    handleMoveMade,
    handleTimeUpdate,
    handlePlayerDisconnect,
    handlePlayerReconnect,
    handleGameEnd
  ]);

  // Эффект для обработки изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setCellSize(window.innerWidth <= 768 ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработчики событий
  const handleMoveMade = useCallback((data) => {
    if (!gameSession?.id || data.gameId !== gameSession.id) return;
    
    setBoard(prevBoard => {
      const newBoard = [...prevBoard];
      const { x, y } = data.position;
      if (!newBoard[x]) newBoard[x] = [];
      newBoard[x][y] = data.player;
      
      const winResult = checkWinner(newBoard, x, y, data.player);
      if (winResult) {
        setWinner(winResult.player);
        setWinLine({ start: winResult.start, end: winResult.end });
      }
      
      return newBoard;
    });
    
    setCurrentPlayer(data.player === "X" ? "O" : "X");
  }, [gameSession?.id]);

  const handleTimeUpdate = useCallback((times) => {
    setPlayerTimes(times);
  }, []);

  const handlePlayerDisconnect = useCallback((data) => {
    console.log('👋 Player disconnected:', data);
  }, []);

  const handlePlayerReconnect = useCallback((data) => {
    console.log('🔄 Player reconnected:', data);
  }, []);

  const handleGameEnd = useCallback((data) => {
    setWinner(data.winner);
    navigate('/');
  }, [navigate]);

  // Обработчик клика по ячейке
  const handleCellClick = useCallback(async (x, y) => {
    if (!gameSession?.id || winner || board[x][y] || currentPlayer !== "X") return;

    try {
      await makeMove(gameSession.id, { x, y }, currentPlayer, Date.now());
    } catch (error) {
      console.error('Failed to make move:', error);
      setError('Failed to make move. Please try again.');
    }
  }, [gameSession?.id, winner, board, currentPlayer]);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="game-container">
      <GameHeader
        currentPlayer={currentPlayer}
        playerTimes={playerTimes}
        winner={winner}
      />
      <div 
        className="board-container"
        ref={boardRef}
        style={{
          width: BOARD_SIZE * cellSize,
          height: BOARD_SIZE * cellSize
        }}
      >
        {/* Рендер игрового поля */}
        {board.map((row, x) => 
          row.map((cell, y) => (
            <div
              key={`${x}-${y}`}
              className="cell"
              style={{
                width: cellSize,
                height: cellSize,
                left: x * cellSize,
                top: y * cellSize
              }}
              onClick={() => handleCellClick(x, y)}
            >
              {cell && <Shape type={cell} />}
            </div>
          ))
        )}
        {/* Рендер линии победы */}
        {winLine && (
          <div
            className="win-line"
            style={{
              left: winLine.start[0] * cellSize + cellSize / 2,
              top: winLine.start[1] * cellSize + cellSize / 2,
              width: Math.sqrt(
                Math.pow((winLine.end[0] - winLine.start[0]) * cellSize, 2) +
                Math.pow((winLine.end[1] - winLine.start[1]) * cellSize, 2)
              ),
              transform: `rotate(${Math.atan2(
                (winLine.end[1] - winLine.start[1]) * cellSize,
                (winLine.end[0] - winLine.start[0]) * cellSize
              )}rad)`
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Game;
