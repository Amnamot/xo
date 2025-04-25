import React, { useState, useRef, useEffect } from "react";
import Shape, { WinLine } from "./Shape";

const BOARD_SIZE = 100;
const WIN_CONDITION = 5;
const CELL_SIZE_DESKTOP = 60;
const CELL_SIZE_MOBILE = 40;
const APP_VERSION = "1.0.4";
const INITIAL_POSITION = Math.floor(BOARD_SIZE / 2);

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const checkWinner = (board, row, col, player) => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
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
      if (board[row][col]) {
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

const Game = () => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  const [board, setBoard] = useState(() => {
    const newBoard = createEmptyBoard();
    newBoard[INITIAL_POSITION][INITIAL_POSITION] = "X";
    return newBoard;
  });

  const [currentPlayer, setCurrentPlayer] = useState("O");
  const [winner, setWinner] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState(null);
  const [initialDistance, setInitialDistance] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.style.transform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`;
    }
  }, [position, scale]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setInitialDistance(Math.sqrt(dx * dx + dy * dy));
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && touchStart) {
      setPosition({
        x: e.touches[0].clientX - touchStart.x,
        y: e.touches[0].clientY - touchStart.y,
      });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      if (initialDistance) {
        const zoom = newDistance / initialDistance;
        setScale((prev) => Math.min(Math.max(prev * zoom, 0.5), 2));
        setInitialDistance(newDistance);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setInitialDistance(null);
  };

  const visibleCells = getVisibleCells(board);

  const handleCellClick = (row, col) => {
    if (!visibleCells.has(`${row}-${col}`) || winner) return;
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard, row, col, currentPlayer);
    if (result) {
      setWinner(result.player);
      setWinLine(result);
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  };

  return (
    <div
      className="flex flex-col items-center p-0 overflow-hidden h-screen w-screen relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={boardRef}
        className="grid absolute top-1/2 left-1/2"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
        }}
      >
        {board.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] border border-gray-500 flex items-center justify-center ${
                visibleCells.has(`${i}-${j}`) ? "bg-gray-200" : "bg-gray-500"
              }`}
              onClick={() => handleCellClick(i, j)}
            >
              {cell && <Shape type={cell} />}
            </div>
          ))
        )}
        {winLine && (
          <WinLine
            start={winLine.start}
            end={winLine.end}
            cellSize={CELL_SIZE}
          />
        )}
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        Версия: {APP_VERSION}
      </div>
    </div>
  );
};

export default Game;
