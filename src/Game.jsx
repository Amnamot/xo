// Game.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from './contexts/SocketContext';
import { gameService } from './services/game';
import { useNavigate } from 'react-router-dom';
import GameHeader from './components/GameHeader';
import './Game.css';
import './Shape.css';
import Shape from './Shape';
import WaitModal from './components/WaitModal';
import { lobbyService } from './services/lobby';

const BOARD_SIZE = 100;
const WIN_CONDITION = 5;
const CELL_SIZE_DESKTOP = 60;
const CELL_SIZE_MOBILE = 40;
const INITIAL_POSITION = Math.floor(BOARD_SIZE / 2);

const createEmptyBoard = () => {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  console.log('🎲 [Game] Created empty board:', {
    board,
    timestamp: new Date().toISOString()
  });
  return board;
};

// Функции нормализации координат
const normalizeCoordinates = (x, y, boardWidth, boardHeight) => {
  return {
    normalizedX: x / boardWidth,
    normalizedY: y / boardHeight
  };
};

const calculateBoardDimensions = (cellSize) => {
  return {
    width: BOARD_SIZE * cellSize,
    height: BOARD_SIZE * cellSize
  };
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

const Game = ({ lobbyId }) => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const boardRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState(null);
  const [initialDistance, setInitialDistance] = useState(null);
  const [time, setTime] = useState(0);
  const [playerTime1, setPlayerTime1] = useState(0);
  const [playerTime2, setPlayerTime2] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveStartTime, setMoveStartTime] = useState(null);
  const [moveTimer, setMoveTimer] = useState(30000);
  const [winLine, setWinLine] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [error, setError] = useState(null);
  const [boardDimensions, setBoardDimensions] = useState({ width: 0, height: 0 });
  const [showWaitModal, setShowWaitModal] = useState(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  // Эффект для инициализации игры
  useEffect(() => {
    if (!mountedRef.current || !socket) return;
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('current_telegram_id');
    
    // Проверяем флаг showWaitModal из localStorage
    const shouldShowWaitModal = localStorage.getItem('showWaitModal') === 'true';
    if (shouldShowWaitModal) {
      setShowWaitModal(true);
      localStorage.removeItem('showWaitModal'); // Удаляем флаг после использования
    }
    
    const initializeGame = async () => {
      try {
        // Запрашиваем начальное состояние
        socket.emit('getInitialState', { telegramId });

        // Подписываемся на события игры
        gameService.subscribeToGameEvents(socket, {
          onConnect: () => {
            console.log('✅ [Game] Socket connected:', {
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            setIsConnected(true);
            setReconnectAttempts(0);
            setError(null);
          },
          onDisconnect: () => {
            console.log('❌ [Game] Socket disconnected:', {
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            setIsConnected(false);
          },
          onError: (error) => {
            console.error('❌ [Game] Socket error:', {
              error: error.message,
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            setError(error.message);
          },
          onGameStart: (data) => {
            console.log('🎮 [Game] Game started:', {
              data,
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            setGameStartTime(data.startTime);
            setMoveStartTime(data.startTime);
            setError(null);
            setShowWaitModal(false);
          },
          onGameState: (gameState) => {
            console.log('📊 [Game] Game state received:', {
              gameState,
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            
            // Проверяем и логируем состояние доски
            const newBoard = gameState.board || createEmptyBoard();
            console.log('🎯 [Game] Board state:', {
              hasBoard: !!newBoard,
              boardType: newBoard ? typeof newBoard : 'null',
              isArray: Array.isArray(newBoard),
              timestamp: new Date().toISOString()
            });
            
            setBoard(newBoard);
            setCurrentPlayer(gameState.currentPlayer);
            setScale(gameState.scale);
            setPosition(gameState.position);
            setTime(gameState.time || 0);
            setPlayerTime1(gameState.playerTime1 || 0);
            setPlayerTime2(gameState.playerTime2 || 0);
            setGameSession(gameState.gameSession);
            if (!opponentInfo && gameState.opponentInfo) {
              setOpponentInfo(gameState.opponentInfo);
            }
            setMoveTimer(gameState.maxMoveTime || 30000);
            if (gameState.startTime) {
              setGameStartTime(gameState.startTime);
              setMoveStartTime(gameState.startTime);
            }
            setError(null);
          },
          onMoveMade: (data) => {
            setBoard(data.gameState.board);
            setCurrentPlayer(data.gameState.currentTurn);
            setMoveStartTime(data.gameState.moveStartTime);
            setMoveTimer(30000);
            // Проверяем победителя
            const winner = data.gameState.winner;
            if (winner) {
              setWinLine({
                start: data.gameState.winLineStart,
                end: data.gameState.winLineEnd
              });
            }
            setError(null);
          },
          onPlayerDisconnected: () => {
            console.log('👋 [Game] Player disconnected');
            setError('Opponent disconnected');
          },
          onGameEnded: (data) => {
            console.log('🏁 [Game] Game ended:', data);
            const currentTelegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
            if (data.winner === currentTelegramId) {
              navigate('/end');
            } else {
              navigate('/lost');
            }
          }
        });

        // Подписываемся на события лобби
        lobbyService.subscribeToLobbyEvents(socket, telegramId, {
          onLobbyReady: (data) => {
            console.log('🎮 [Game] Lobby ready:', {
              data,
              socketId: socket.id,
              lobbyId,
              timestamp: new Date().toISOString()
            });
            setShowWaitModal(true);
          },
          onLobbyDeleted: () => {
            console.log('❌ [Game] Lobby deleted');
            navigate('/');
          }
        });

      } catch (error) {
        console.error('❌ [Game] Error initializing game:', error);
        setError(error.message);
        
        // Пробуем переподключиться
        if (reconnectAttempts < 3) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(async () => {
            try {
              await gameService.reconnect(socket, lobbyId, telegramId);
            } catch (reconnectError) {
              console.error('❌ [Game] Reconnection failed:', reconnectError);
              setError(reconnectError.message);
            }
          }, 2000);
        }
      }
    };

    initializeGame();

    return () => {
      mountedRef.current = false;
      gameService.unsubscribeFromGameEvents(socket);
    };
  }, [socket, lobbyId, navigate, opponentInfo, reconnectAttempts]);

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
    if (socket && moveTimer === 0 && isOurTurn) {
      socket.emit('timeExpired', {
        gameId: gameSession?.id,
        player: currentPlayer
      });
    }
  }, [moveTimer, isOurTurn, gameSession?.id, currentPlayer, socket]);

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
    if (currentPlayer !== (String(gameSession?.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id) ? "x" : "o")) return;
    
    try {
      const moveTime = Date.now() - moveStartTime;
      const { normalizedX, normalizedY } = normalizeCoordinates(
        col * CELL_SIZE,
        row * CELL_SIZE,
        boardDimensions.width,
        boardDimensions.height
      );
      
      await gameService.makeMove(
        socket,
        gameSession.id,
        { row, col, normalizedX, normalizedY },
        currentPlayer,
        moveTime
      );
    } catch (error) {
      console.error('❌ [Game] Error making move:', error);
      setError(error.message);
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
    <div className="game-container">
      {showWaitModal && (
        <WaitModal
          onClose={() => setShowWaitModal(false)}
          onCancel={async () => {
            try {
              const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
              await lobbyService.cancelLobby(socket, telegramId);
              navigate('/');
            } catch (error) {
              console.error('❌ [Game] Error cancelling lobby:', {
                error: error.message,
                socketId: socket.id,
                timestamp: new Date().toISOString()
              });
              setError('Failed to cancel lobby');
            }
          }}
          telegramId={window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()}
          lobbyId={lobbyId}
        />
      )}
      <GameHeader 
        currentPlayer={currentPlayer?.toLowerCase()} 
        moveTimer={moveTimer} 
        time={time}
        playerTime1={playerTime1}
        playerTime2={playerTime2}
        opponentInfo={{
          name: opponentInfo?.name || 'Caesar',
          avatar: opponentInfo?.avatar || 'JohnAva.png'
        }}
        isConnected={isConnected}
        isCreator={gameSession ? 
          String(gameSession.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id) : 
          null}
        gameSession={{
          players: {
            x: {
              isCreator: String(gameSession?.creatorId) === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
              isOpponent: false,
              moveTimer,
              time,
              playerTime1,
              playerTime2
            },
            o: {
              isCreator: String(gameSession?.creatorId) !== String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id),
              isOpponent: true,
              moveTimer,
              time,
              playerTime1,
              playerTime2,
              name: opponentInfo?.name || 'Caesar',
              avatar: opponentInfo?.avatar || 'JohnAva.png'
            }
          }
        }}
        onExit={() => navigate('/')}
        error={error}
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
        {((board || createEmptyBoard() || [])).map((row, i) =>
          (row || []).map((cell, j) => (
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
